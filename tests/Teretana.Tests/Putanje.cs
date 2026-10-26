namespace Teretana.Tests;

/// <summary>Finds the project root (the folder with Teretana.slnx) so the tests can read pictures and source files.</summary>
internal static class Putanje
{
    public static string Korijen { get; } = Nadji();

    public static string Web => Path.Combine(Korijen, "src", "Teretana.Web");

    public static string Slike => Path.Combine(Web, "wwwroot", "img");

    private static string Nadji()
    {
        var d = new DirectoryInfo(AppContext.BaseDirectory);
        while (d is not null && !File.Exists(Path.Combine(d.FullName, "Teretana.slnx"))) d = d.Parent;
        return d?.FullName ?? throw new InvalidOperationException("Nije nađen Teretana.slnx iznad " + AppContext.BaseDirectory);
    }
}
