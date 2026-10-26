export function HomeTrustStrip() {
  return (
    <section aria-label="Presentation tools" className="mt-5 grid gap-3 md:grid-cols-3">
      {[
        ['Every part covered', 'Review to assessment, with every question on its own slide.'],
        ['Edit like PowerPoint', 'Rearrange, edit on the slide, then download the .pptx.'],
        ['Text that fits', 'Long passages split across slides so nothing is cut off.'],
      ].map(([title, text]) => (
        <div key={title} className="rounded-xl border border-sky-100 bg-white px-4 py-3 text-[13px] leading-relaxed text-slate-600">
          <h2 className="mb-1 text-[13px] font-bold text-slate-900">{title}</h2>
          <p>{text}</p>
        </div>
      ))}
    </section>
  );
}
