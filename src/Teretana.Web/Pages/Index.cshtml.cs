using Microsoft.AspNetCore.Mvc.RazorPages;
using Teretana.Web.Data;

namespace Teretana.Web.Pages;

public class IndexModel : PageModel
{
    public IReadOnlyList<Brojka> Brojke => Sadrzaj.Brojke;
    public IReadOnlyList<ProgramTreninga> Programi => Sadrzaj.Programi;
    public IReadOnlyList<DanRasporeda> Raspored => Sadrzaj.Raspored;
    public IReadOnlyList<PlanClanarine> Planovi => Sadrzaj.Planovi;
    public IReadOnlyList<Trener> Treneri => Sadrzaj.Treneri;
    public IReadOnlyList<Utisak> Utisci => Sadrzaj.Utisci;
    public IReadOnlyList<RadnoVrijeme> Radno => Sadrzaj.Radno;
}
