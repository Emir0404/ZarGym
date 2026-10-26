using System.Net;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc.Testing;
using Teretana.Web.Data;

namespace Teretana.Tests;

/// <summary>Starts the real app in memory and checks the pages as a browser sees them.</summary>
public class WebTests(WebApplicationFactory<Program> fabrika) : IClassFixture<WebApplicationFactory<Program>>
{
    /// <summary>The HTML from the server as a browser sees it (entities like &#x2B; are turned into characters).</summary>
    private async Task<string> Pocetna() => WebUtility.HtmlDecode(await Sirovo());

    private async Task<string> Sirovo() => await fabrika.CreateClient().GetStringAsync("/");

    [Fact]
    public async Task Pocetna_VracaHtmlSaSvimOdjeljcima()
    {
        var r = await fabrika.CreateClient().GetAsync("/");
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.StartsWith("text/html", r.Content.Headers.ContentType!.MediaType);
        var html = await r.Content.ReadAsStringAsync();
        foreach (var id in new[] { "pocetak", "brojke", "programi", "zasto", "prostor", "raspored", "clanarine", "treneri", "utisci", "poziv", "kontakt" })
            Assert.Contains($"id=\"{id}\"", html);
    }

    [Fact]
    public async Task Pocetna_PrikazujeSadrzajIzCSharpPodataka()
    {
        var html = await Pocetna();
        Assert.All(Sadrzaj.Programi, p => Assert.Contains(p.Naziv, html));
        Assert.All(Sadrzaj.Planovi, p => Assert.Contains(p.Naziv, html));
        Assert.All(Sadrzaj.Treneri, t => Assert.Contains(t.Ime, html));
        Assert.Contains(Sadrzaj.Telefon, html);
        Assert.Contains(Sadrzaj.Adresa, html);
        // every class from the schedule is on the page
        Assert.Equal(Sadrzaj.Raspored.Sum(d => d.Termini.Count), Regex.Matches(html, "class=\"termin\"").Count);
    }

    [Fact]
    public async Task Pocetna_SlovaCcSZDjSuIspisanaKaoSlovaINeKaoHtmlEntiteti()
    {
        var html = await Sirovo();
        Assert.Contains("Žar", html);
        Assert.Contains("Članarine", html);
        Assert.Contains("Četvrtak", html);
        // Latin extensions (U+0100 to U+017F: č ć đ š ž) must not be turned into &#x1XX; entities.
        Assert.DoesNotMatch("&#x1[0-7][0-9A-Fa-f];", html);
    }

    [Fact]
    public async Task Pocetna_ImaTacnoJedanH1_SvakaSlikaImaAltIDimenzije()
    {
        var html = await Pocetna();
        Assert.Single(Regex.Matches(html, "<h1[ >]"));
        foreach (Match m in Regex.Matches(html, "<img [^>]*>"))
        {
            Assert.Contains(" alt=", m.Value);
            Assert.Contains(" width=", m.Value);
            Assert.Contains(" height=", m.Value);
        }
    }

    [Fact]
    public async Task Pocetna_NemaObrazaIRezervacija()
    {
        var html = await Pocetna();
        Assert.DoesNotContain("<form", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("rezerv", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("tel:+38761000000", html);
    }

    [Fact]
    public async Task Pocetna_SveSlikeIzHtmlaSeMoguPreuzeti()
    {
        var klijent = fabrika.CreateClient();
        var html = await klijent.GetStringAsync("/");
        var slike = Regex.Matches(html, "src=\"(/img/[^\"]+)\"").Select(m => m.Groups[1].Value).Distinct().ToList();
        Assert.NotEmpty(slike);
        foreach (var s in slike)
            Assert.Equal(HttpStatusCode.OK, (await klijent.GetAsync(s)).StatusCode);
    }

    [Fact]
    public async Task Pocetna_ImaNaslovOpisITamnuShemu()
    {
        var html = await Pocetna();
        Assert.Contains("<title>Žar – teretana u Sarajevu</title>", html);
        Assert.Matches("<meta name=\"description\" content=\"[^\"]{60,}", html);
        Assert.Contains("<meta name=\"color-scheme\" content=\"dark\"", html);
        Assert.Contains("lang=\"bs\"", html);
    }

    [Fact]
    public async Task NepostojecaStranica_Vraca404SaNasomStranicom()
    {
        var r = await fabrika.CreateClient().GetAsync("/nema-ovoga");
        Assert.Equal(HttpStatusCode.NotFound, r.StatusCode);
        var html = await r.Content.ReadAsStringAsync();
        Assert.Contains("Ovdje nema", html);
        Assert.Contains("Na početnu", html);
    }

    [Fact]
    public async Task Robots_ISitemap_Rade()
    {
        var klijent = fabrika.CreateClient();
        var robots = await klijent.GetStringAsync("/robots.txt");
        Assert.Contains("User-agent: *", robots);
        Assert.Contains("/sitemap.xml", robots);
        var mapa = await klijent.GetStringAsync("/sitemap.xml");
        Assert.Contains("<urlset", mapa);
        Assert.Contains("<loc>", mapa);
    }

    [Fact]
    public async Task OdgovorImaSigurnosnaZaglavlja()
    {
        var r = await fabrika.CreateClient().GetAsync("/");
        Assert.Equal("nosniff", r.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("DENY", r.Headers.GetValues("X-Frame-Options").Single());
        Assert.True(r.Headers.Contains("Referrer-Policy"));
    }

    [Fact]
    public async Task StatickiFajlovi_SeKesirajuDuze_ACssIJsImajuOtisak()
    {
        var klijent = fabrika.CreateClient();
        var slika = await klijent.GetAsync("/img/kardio-uze.jpg");
        Assert.Contains("max-age=604800", slika.Headers.CacheControl!.ToString());
        var html = await klijent.GetStringAsync("/");
        Assert.Matches(@"/css/site\.css\?v=[\w-]+", html);
        Assert.Matches(@"/js/site\.js\?v=[\w-]+", html);
    }

    [Fact]
    public async Task Html_SeKompresuje_KadaPreglednikTrazi()
    {
        var klijent = fabrika.CreateClient();
        var zahtjev = new HttpRequestMessage(HttpMethod.Get, "/");
        zahtjev.Headers.AcceptEncoding.ParseAdd("gzip");
        var r = await klijent.SendAsync(zahtjev);
        Assert.Contains("gzip", r.Content.Headers.ContentEncoding);
    }
}
