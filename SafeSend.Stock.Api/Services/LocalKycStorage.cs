using Microsoft.Extensions.Options;

namespace SafeSend.Stock.Api.Services;

public sealed class LocalKycStorage : IKycStorage
{
    private readonly KycStorageOptions _opts;

    public LocalKycStorage(IOptions<KycStorageOptions> opts)
    {
        _opts = opts.Value;
    }

    public async Task<KycStoredFile> SaveAsync(
    string userName,        // changed from userId
    Stream fileStream,
    string originalFileName,
    string contentType,
    CancellationToken ct)
    {
        var ext = Path.GetExtension(originalFileName);
        if (string.IsNullOrWhiteSpace(ext) || ext.Length > 10) ext = ".bin";

        var fileName = $"{Guid.NewGuid():N}{ext}";

        // Sanitize userName to be safe as a folder name
        var safeName = string.Concat(userName.Split(Path.GetInvalidFileNameChars()));
        var storageKey = Path.Combine("user", safeName, fileName).Replace('\\', '/');

        var fullPath = GetFullPath(storageKey);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        await using var outStream = new FileStream(
            fullPath,
            FileMode.CreateNew,
            FileAccess.Write,
            FileShare.None,
            bufferSize: 1024 * 64,
            useAsync: true);

        await fileStream.CopyToAsync(outStream, ct);
        await outStream.FlushAsync(ct);

        var fi = new FileInfo(fullPath);

        return new KycStoredFile(
            StorageKey: storageKey,
            OriginalFileName: originalFileName,
            ContentType: string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
            SizeBytes: fi.Length
        );
    }

    public Task<Stream> OpenReadAsync(string storageKey, CancellationToken ct)
    {
        var fullPath = GetFullPath(storageKey);
        Stream s = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read, 1024 * 64, useAsync: true);
        return Task.FromResult(s);
    }

    public Task DeleteAsync(string storageKey, CancellationToken ct)
    {
        var fullPath = GetFullPath(storageKey);
        if (File.Exists(fullPath))
            File.Delete(fullPath);

        return Task.CompletedTask;
    }

    private string GetFullPath(string storageKey)
    {
        // Normalize and prevent traversal
        storageKey = storageKey.Replace('\\', '/').TrimStart('/');
        if (storageKey.Contains("..", StringComparison.Ordinal))
            throw new InvalidOperationException("Invalid storage key.");

        var root = _opts.RootPath;
        var combined = Path.Combine(root, storageKey.Replace('/', Path.DirectorySeparatorChar));
        var full = Path.GetFullPath(combined);

        var fullRoot = Path.GetFullPath(root);
        if (!full.StartsWith(fullRoot, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Invalid storage key.");

        return full;
    }
}