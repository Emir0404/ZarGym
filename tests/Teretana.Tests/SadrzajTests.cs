using Teretana.Web.Data;

namespace Teretana.Tests;

public class SadrzajTests
{
    [Fact]
    public void Raspored_ImaSedamDana_APocinjePonedjeljkom()
    {
        Assert.Equal(7, Sadrzaj.Raspored.Count);
        Assert.Equal(DayOfWeek.Monday, Sadrzaj.Raspored[0].Dan);
        Assert.Equal(DayOfWeek.Sunday, Sadrzaj.Raspored[6].Dan);
        Assert.Equal(7, Sadrzaj.Raspored.Select(d => d.Dan).Distinct().Count());
    }

    [Fact]
    public void Raspored_TerminiSuPoredaniPoVremenuIBezPreklapanja()
    {
        foreach (var dan in Sadrzaj.Raspored)
        {
            Assert.NotEmpty(dan.Termini);
            for (var i = 1; i < dan.Termini.Count; i++)
                Assert.True(dan.Termini[i - 1].Kraj <= dan.Termini[i].Pocetak,
                    $"{dan.Dan}: {dan.Termini[i - 1].Naziv} se preklapa s {dan.Termini[i].Naziv}");
        }
    }

    [Fact]
    public void Raspored_TerminiSuUnutarRadnogVremenaTeretane()
    {
        // Opening hours: Mon-Fri 05-23, Sat 07-22, Sun 08-20.
        static (TimeOnly od, TimeOnly @do) Sati(DayOfWeek d) => d switch
        {
            DayOfWeek.Saturday => (new(7, 0), new(22, 0)),
            DayOfWeek.Sunday => (new(8, 0), new(20, 0)),
            _ => (new(5, 0), new(23, 0)),
        };
        foreach (var dan in Sadrzaj.Raspored)
        {
            var (od, @do) = Sati(dan.Dan);
            Assert.All(dan.Termini, t =>
            {
                Assert.True(t.Pocetak >= od, $"{dan.Dan} {t.Naziv} počinje prije otvaranja");
                Assert.True(t.Kraj <= @do, $"{dan.Dan} {t.Naziv} završava nakon zatvaranja");
            });
        }
    }

    [Fact]
    public void Raspored_SviTreneriPostojeUTimu_ASvakiTrenerImaBarJedanTermin()
    {
        var imena = Sadrzaj.Treneri.Select(t => t.Ime).ToHashSet();
        var uRasporedu = Sadrzaj.Raspored.SelectMany(d => d.Termini).Select(t => t.Trener).ToHashSet();
        Assert.All(uRasporedu, ime => Assert.Contains(ime, imena));
        Assert.All(imena, ime => Assert.Contains(ime, uRasporedu));
    }

    [Fact]
    public void Raspored_TrajanjeJeViseKratnikOd15Minuta() =>
        Assert.All(Sadrzaj.Raspored.SelectMany(d => d.Termini), t => Assert.Equal(0, t.TrajanjeMin % 15));

    [Fact]
    public void Brojke_SeRacunajuIzPodataka_NeUpisujuSeRucno()
    {
        var grupni = Sadrzaj.Brojke.Single(b => b.Oznaka.StartsWith("grupnih"));
        Assert.Equal(Sadrzaj.Raspored.Sum(d => d.Termini.Count), grupni.Vrijednost);
        var treneri = Sadrzaj.Brojke.Single(b => b.Oznaka.StartsWith("trenera"));
        Assert.Equal(Sadrzaj.Treneri.Count, treneri.Vrijednost);
    }

    [Fact]
    public void Planovi_ImaTacnoJedanIstaknut_ACijeneRasteSaTrajanjem()
    {
        Assert.Single(Sadrzaj.Planovi, p => p.Istaknut);
        Assert.Equal(Sadrzaj.Planovi.OrderBy(p => p.Cijena), Sadrzaj.Planovi);
        Assert.Equal(Sadrzaj.Planovi.OrderBy(p => p.Mjeseci), Sadrzaj.Planovi);
    }

    [Fact]
    public void Planovi_DuzaClanarinaJeJeftinijaPoMjesecu()
    {
        var poMjesecu = Sadrzaj.Planovi.Select(p => p.PoMjesecu).ToList();
        Assert.Equal(poMjesecu.OrderByDescending(x => x), poMjesecu);
        Assert.Equal(40m, Sadrzaj.Planovi.Single(p => p.Mjeseci == 12).PoMjesecu);
        Assert.Equal(46.67m, Sadrzaj.Planovi.Single(p => p.Mjeseci == 3).PoMjesecu);
    }

    [Theory]
    [InlineData(55, "55 KM")]
    [InlineData(46.67, "46,67 KM")]
    [InlineData(8, "8 KM")]
    public void KM_PisePoBosanski_SaZarezom(double cijena, string ocekivano) =>
        Assert.Equal(ocekivano, Sadrzaj.KM((decimal)cijena));

    [Theory]
    [InlineData(1200, "1.200")]
    [InlineData(60, "60")]
    [InlineData(1234567, "1.234.567")]
    public void Broj_KoristiTackuKaoRazdjelnikHiljada(int n, string ocekivano) =>
        Assert.Equal(ocekivano, Sadrzaj.Broj(n));

    [Fact]
    public void Sat_JeUDvadesetCetiriSata() =>
        Assert.Equal("19:30", Sadrzaj.Sat(new TimeOnly(19, 30)));

    [Theory]
    [InlineData(DayOfWeek.Monday, "Ponedjeljak", "Pon")]
    [InlineData(DayOfWeek.Thursday, "Četvrtak", "Čet")]
    [InlineData(DayOfWeek.Sunday, "Nedjelja", "Ned")]
    public void NaziviDana_SuNaBosanskom(DayOfWeek dan, string puni, string kratki)
    {
        Assert.Equal(puni, Sadrzaj.NazivDana(dan));
        Assert.Equal(kratki, Sadrzaj.KratkiDan(dan));
    }

    [Fact]
    public void Trener_InicijaliSePraveOdImenaIPrezimena() =>
        Assert.Equal("AH", new Trener("Amar Hodžić", "x", "y").Inicijali);

    [Fact]
    public void Programi_ImajuJedinstvenBrojINaziv_ISlikaPostojiNaDisku()
    {
        Assert.Equal(Sadrzaj.Programi.Count, Sadrzaj.Programi.Select(p => p.Broj).Distinct().Count());
        Assert.Equal(Sadrzaj.Programi.Count, Sadrzaj.Programi.Select(p => p.Naziv).Distinct().Count());
        Assert.All(Sadrzaj.Programi, p =>
        {
            Assert.True(File.Exists(Path.Combine(Putanje.Slike, p.Slika)), $"Nema slike {p.Slika}");
            Assert.False(string.IsNullOrWhiteSpace(p.AltTekst));
        });
    }

    [Fact]
    public void Utisci_SuOznaceniKaoPrimjeri_ImenaSuSamoSaInicijalomPrezimena() =>
        Assert.All(Sadrzaj.Utisci, u => Assert.Matches(@"^\p{L}+ \p{L}\.$", u.Ime));
}
