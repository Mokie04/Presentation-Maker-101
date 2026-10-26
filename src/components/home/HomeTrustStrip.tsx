import { getPartAccentClass } from '@/components/part-badge';

export function HomeTrustStrip() {
  return (
    <section aria-label="Presentation tools" className="mt-5 grid gap-3 md:grid-cols-3">
      {([
        ['Review', 'Every part covered', 'Review to assessment, with every question on its own slide.'],
        ['Lesson Presentation', 'Edit like PowerPoint', 'Rearrange, edit on the slide, then download the .pptx.'],
        ['Activities', 'Text that fits', 'Long passages split across slides so nothing is cut off.'],
      ] as const).map(([part, title, text]) => (
        <div key={title} className="relative overflow-hidden rounded-xl border border-sky-100 bg-white px-4 pb-3 pt-4 text-[13px] leading-relaxed text-slate-600">
          <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${getPartAccentClass(part)}`} />
          <h2 className="mb-1 text-[13px] font-bold text-slate-900">{title}</h2>
          <p>{text}</p>
        </div>
      ))}
    </section>
  );
}
