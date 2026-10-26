using System.Text.RegularExpressions;

namespace Teretana.Tests;

/// <summary>
/// Makes sure the text is Bosnian and that nothing forbidden is left in the source:
/// words from Croatian/Serbian, bookings and forms (the site is promotional only).
/// </summary>
public class TekstTests
{
    private static IEnumerable<(string fajl, string tekst)> Izvori()
    {
        foreach (var dir in new[] { Path.Combine(Putanje.Web, "Pages"), Path.Combine(Putanje.Web, "Data") })
            foreach (var f in Directory.EnumerateFiles(dir, "*.*", SearchOption.AllDirectories)
                         .Where(f => f.EndsWith(".cshtml") || f.EndsWith(".cs")))
                yield return (Path.GetRelativePath(Putanje.Korijen, f), File.ReadAllText(f));
    }

    [Theory]
    // Words that are not Bosnian (in brackets, the Bosnian word): tjedan (sedmica), točno (tačno), sustav (sistem),
    // tvrtka (firma), poduzeće (preduzeće), obitelj (porodica), tisuća (hiljada), kruh (hljeb), pećnica (rerna).
    [InlineData("tjed")]
    [InlineData("točn")]
    [InlineData("sustav")]
    [InlineData("tvrtk")]
    [InlineData("poduzeć")]
    [InlineData("obitelj")]
    [InlineData("tisuć")]
    [InlineData("kruh")]
    [InlineData("pećnic")]
    public void UIzvornomKodu_NemaRijeciKojeNisuBosanske(string rijec)
    {
        // Only at the start of a word: "tvrtk" is wrong, but "četvrtkom" is correct Bosnian.
        var uzorak = new Regex(@"(?<!\p{L})" + Regex.Escape(rijec), RegexOptions.IgnoreCase);
        var nadjeno = Izvori().Where(x => uzorak.IsMatch(x.tekst)).Select(x => x.fajl).ToList();
        Assert.True(nadjeno.Count == 0, $"Riječ '{rijec}' je u: {string.Join(", ", nadjeno)}");
    }

    [Fact]
    public void NemaRezervacijaINemaObrazaca()
    {
        foreach (var (fajl, tekst) in Izvori())
        {
            Assert.DoesNotContain("<form", tekst, StringComparison.OrdinalIgnoreCase);
            Assert.False(Regex.IsMatch(tekst, "rezerv", RegexOptions.IgnoreCase), $"'rezerv' u {fajl}");
        }
    }

    [Fact]
    public void KoristiSeSamoPromotivnaIzmisljenaImena_IDemoNapomenaPostoji() =>
        Assert.Contains(Izvori(), x => x.fajl.EndsWith("_Layout.cshtml") && x.tekst.Contains("Demo stranica"));
}
