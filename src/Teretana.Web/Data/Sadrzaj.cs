namespace Teretana.Web.Data;

/// <summary>One big number on the page ("1.200 m²"). <see cref="Vrijednost"/> is animated from zero up to that number.</summary>
public record Brojka(int Vrijednost, string Sufiks, string Oznaka);

/// <param name="Klasa">Extra CSS class for the card's place in the grid (e.g. a large card).</param>
public record ProgramTreninga(string Broj, string Naziv, string Opis, string Slika, string AltTekst, string Nivo, string Klasa = "");

public record PlanClanarine(string Naziv, decimal Cijena, string Period, int Mjeseci, string[] Prednosti, bool Istaknut = false)
{
    /// <summary>Price per month, to show how much a longer membership saves.</summary>
    public decimal PoMjesecu => Math.Round(Cijena / Mjeseci, 2);
}

public record Trener(string Ime, string Uloga, string Specijalnost)
{
    /// <summary>Letters for the circle on the card (there are deliberately no photos of trainers).</summary>
    public string Inicijali => string.Concat(Ime.Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(d => d[0]));
}

public record Termin(TimeOnly Pocetak, int TrajanjeMin, string Naziv, string Trener, string Nivo)
{
    public TimeOnly Kraj => Pocetak.AddMinutes(TrajanjeMin);
}

public record DanRasporeda(DayOfWeek Dan, IReadOnlyList<Termin> Termini);

public record Utisak(string Tekst, string Ime, string Detalj);

public record RadnoVrijeme(string Dani, string Sati);

/// <summary>
/// All the page's content in one place (the fictional gym "Žar" from Sarajevo). The page only displays it,
/// and the tests check that it is correct (hours, prices, pictures, words).
/// </summary>
public static class Sadrzaj
{
    public const string Naziv = "Žar";
    public const string Adresa = "Ulica Primjera 5, 71000 Sarajevo";
    public const string Telefon = "+387 61 000 000";
    public const string TelefonLink = "+38761000000";
    public const string Eposta = "zdravo@zar-demo.example";

    public static IReadOnlyList<RadnoVrijeme> Radno { get; } =
    [
        new("Ponedjeljak – petak", "05:00 – 23:00"),
        new("Subota", "07:00 – 22:00"),
        new("Nedjelja", "08:00 – 20:00"),
    ];

    public static IReadOnlyList<ProgramTreninga> Programi { get; } =
    [
        new("01", "Snaga", "Slobodni tegovi, šipke i sprave. Plan za početnike i za one koji već znaju šta rade.",
            "snaga-bucice.jpg", "Dva crna ručna tega na crnoj prostirci", "Svi nivoi", "veliko"),
        new("02", "Funkcionalni trening", "Kettlebell, vratila i tvoje tijelo. Kondicija koja se vidi i u svakodnevici.",
            "snaga-vratilo.jpg", "Muškarac viđen s leđa visi na crvenoj šipki u tamnoj teretani", "Svi nivoi"),
        new("03", "Kardio", "Uže, bicikli i intervali koji te razbude. Kratko, jako i bez dosade.",
            "kardio-uze.jpg", "Noge osobe koja skače preko užeta ispred zida od cigle", "Početnik"),
        new("04", "Boks", "Vreće, rukavice i tehnika. Treniraš udarce, ne druge ljude.",
            "boks-ring.jpg", "Ugao boksačkog ringa u slabo osvijetljenoj teretani", "Srednji", "dvostruko"),
        new("05", "Istezanje i mobilnost", "Za zglobove, leđa i oporavak. Nedjeljom, uz tišinu i tihu muziku.",
            "mobilnost.jpg", "Smotane prostirke za vježbanje na polici", "Svi nivoi", "siroko"),
    ];

    public static IReadOnlyList<Trener> Treneri { get; } =
    [
        new("Amar Hodžić", "Glavni trener", "Snaga i funkcionalni trening"),
        new("Lejla Begić", "Trenerica", "Mobilnost i funkcionalni trening"),
        new("Tarik Mehmedović", "Trener boksa", "Boks i kondicija"),
        new("Dino Kadrić", "Trener", "Kardio i kettlebell"),
    ];

    /// <summary>The week starts on Monday, times are in 24-hour format.</summary>
    public static IReadOnlyList<DanRasporeda> Raspored { get; } =
    [
        new(DayOfWeek.Monday,
        [
            T(7, 0, 60, "Funkcionalni trening", "Amar Hodžić", "Svi nivoi"),
            T(12, 0, 45, "Mobilnost", "Lejla Begić", "Svi nivoi"),
            T(18, 0, 60, "Boks", "Tarik Mehmedović", "Srednji"),
            T(19, 30, 60, "Snaga", "Amar Hodžić", "Svi nivoi"),
        ]),
        new(DayOfWeek.Tuesday,
        [
            T(7, 0, 45, "Kardio intervali", "Dino Kadrić", "Početnik"),
            T(18, 0, 60, "Kettlebell", "Dino Kadrić", "Srednji"),
            T(19, 30, 60, "Funkcionalni trening", "Lejla Begić", "Svi nivoi"),
        ]),
        new(DayOfWeek.Wednesday,
        [
            T(7, 0, 60, "Snaga", "Amar Hodžić", "Svi nivoi"),
            T(12, 0, 45, "Mobilnost", "Lejla Begić", "Svi nivoi"),
            T(18, 0, 60, "Boks", "Tarik Mehmedović", "Srednji"),
            T(19, 30, 45, "Kardio intervali", "Dino Kadrić", "Početnik"),
        ]),
        new(DayOfWeek.Thursday,
        [
            T(7, 0, 60, "Funkcionalni trening", "Amar Hodžić", "Svi nivoi"),
            T(18, 0, 60, "Kettlebell", "Dino Kadrić", "Srednji"),
            T(19, 30, 60, "Snaga", "Amar Hodžić", "Svi nivoi"),
        ]),
        new(DayOfWeek.Friday,
        [
            T(7, 0, 45, "Kardio intervali", "Dino Kadrić", "Početnik"),
            T(17, 30, 60, "Boks", "Tarik Mehmedović", "Srednji"),
            T(19, 0, 60, "Funkcionalni trening", "Lejla Begić", "Svi nivoi"),
        ]),
        new(DayOfWeek.Saturday,
        [
            T(9, 0, 60, "Funkcionalni trening", "Amar Hodžić", "Svi nivoi"),
            T(10, 30, 45, "Mobilnost", "Lejla Begić", "Svi nivoi"),
            T(12, 0, 60, "Boks", "Tarik Mehmedović", "Srednji"),
        ]),
        new(DayOfWeek.Sunday,
        [
            T(10, 0, 60, "Mobilnost", "Lejla Begić", "Svi nivoi"),
            T(11, 30, 45, "Kardio intervali", "Dino Kadrić", "Početnik"),
        ]),
    ];

    public static IReadOnlyList<PlanClanarine> Planovi { get; } =
    [
        new("Mjesečna", 55m, "za 1 mjesec", 1,
            ["Cijela teretana, bez ograničenja", "Svi grupni treninzi", "Svlačionice, tuševi, ormarići"]),
        new("Tromjesečna", 140m, "za 3 mjeseca", 3,
            ["Sve iz mjesečne", "Uvodni trening s trenerom", "Jedan gost mjesečno besplatno"], Istaknut: true),
        new("Godišnja", 480m, "za 12 mjeseci", 12,
            ["Sve iz tromjesečne", "Jedna mjesečna pauza po potrebi", "Majica i flaša Žar"]),
    ];

    public const string DnevnaUlaznica = "Dnevna ulaznica 8 KM. Studenti i penzioneri imaju 20% popusta.";

    public static IReadOnlyList<Utisak> Utisci { get; } =
    [
        new("Prvi put u životu mi se ide na trening. Treneri te prate, a niko ne gleda ko diže manje.", "Mia K.", "član osam mjeseci"),
        new("Najbolja oprema u gradu, a nikad nema gužve. Dođem poslije posla i sve je slobodno.", "Adnan H.", "član dvije godine"),
        new("Boks utorkom i četvrtkom mi je spasio sedmicu. Više ne nosim posao kući.", "Selma D.", "član pet mjeseci"),
    ];

    public static IReadOnlyList<Brojka> Brojke { get; } =
    [
        new(1200, " m²", "prostora"),
        new(60, "+", "sprava i stanica"),
        new(Raspored.Sum(d => d.Termini.Count), "", "grupnih treninga sedmično"),
        new(Treneri.Count, "", "trenera na podu"),
    ];

    /// <summary>Price with a comma and the currency ("55 KM", "46,67 KM"), whatever the browser language.</summary>
    public static string KM(decimal cijena) =>
        (cijena % 1 == 0 ? cijena.ToString("0", System.Globalization.CultureInfo.InvariantCulture)
                         : cijena.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture).Replace('.', ','))
        + " KM";

    /// <summary>Time in 24-hour format ("07:00").</summary>
    public static string Sat(TimeOnly t) => t.ToString("HH:mm", System.Globalization.CultureInfo.InvariantCulture);

    /// <summary>Number with a dot as the thousands separator ("1.200"), as it is written here.</summary>
    public static string Broj(int n) => n.ToString("N0", System.Globalization.CultureInfo.InvariantCulture).Replace(',', '.');

    public static string NazivDana(DayOfWeek dan) => dan switch
    {
        DayOfWeek.Monday => "Ponedjeljak",
        DayOfWeek.Tuesday => "Utorak",
        DayOfWeek.Wednesday => "Srijeda",
        DayOfWeek.Thursday => "Četvrtak",
        DayOfWeek.Friday => "Petak",
        DayOfWeek.Saturday => "Subota",
        _ => "Nedjelja",
    };

    public static string KratkiDan(DayOfWeek dan) => NazivDana(dan)[..3];

    private static Termin T(int sat, int min, int trajanje, string naziv, string trener, string nivo) =>
        new(new TimeOnly(sat, min), trajanje, naziv, trener, nivo);
}
