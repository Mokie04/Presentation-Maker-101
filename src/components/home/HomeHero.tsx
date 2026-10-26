import { Mokie } from './Mokie';
import { getPartBadgeInfo } from '@/components/part-badge';

export function HomeHero() {
  return (
    <section className="grid items-center gap-8 pb-3 pt-7 md:grid-cols-[1.05fr_0.95fr] md:pt-11 lg:gap-10" aria-labelledby="home-title">
      <div>
        <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sun-800">
          <span aria-hidden="true" className="h-0.5 w-6 rounded bg-sun-500" />Lesson plan to slides
        </p>
        <h1 id="home-title" className="text-[30px] font-bold leading-[1.15] tracking-tight text-slate-900 sm:text-[38px] lg:text-[46px]">
          Turn your lesson plan into a <span className="home-highlight">classroom-ready</span> PowerPoint.
        </h1>
        <p className="mb-5 mt-4 max-w-[540px] text-base leading-relaxed text-slate-600 lg:text-[17px]">
          Upload your Daily Lesson Log, pick the session, and get a full deck: review, motivation, lesson, discussion, activities and assessment, with Philippine classroom visuals.
        </p>
        <ol className="flex flex-wrap gap-x-4 gap-y-3 text-xs font-semibold text-slate-600">
          {['Upload your lesson', 'Pick a session', 'Edit and download'].map((step, index) => (
            <li key={step} className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
      <div aria-hidden="true" className="mokie-stage relative hidden h-[340px] items-end justify-center md:flex">
        <div className="absolute left-0 top-0 z-20 max-w-[210px] rounded-2xl rounded-bl-sm border border-sky-100 bg-white px-3.5 py-2.5 text-[13px] font-semibold leading-relaxed text-slate-800 shadow-lg">
          Hi, I&apos;m Mokie! Drop your lesson plan and I&apos;ll build the slides.
        </div>
        {['Lesson Presentation', 'Assessment'].map((part, index) => (
          <div key={part} className={`absolute right-0 z-0 aspect-video w-[122px] rounded-lg border border-sky-100 bg-white p-3 shadow-lg lg:w-[150px] ${index === 0 ? 'top-9 rotate-6' : 'bottom-3 -rotate-3'}`}>
            <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white ${getPartBadgeInfo(part).bg}`}>
              {index === 0 ? 'Lesson' : part}
            </span>
            <i className="mt-2 block h-1 w-4/5 rounded bg-slate-200" /><i className="mt-1.5 block h-1 w-3/5 rounded bg-slate-200" />
          </div>
        ))}
        <Mokie size="hero" />
      </div>
    </section>
  );
}
