import Image from 'next/image';

/** One supplied pose today; size selects its optimised asset and display treatment. */
export function Mokie({ size }: { size: 'hero' | 'small' }) {
  const hero = size === 'hero';
  return (
    <Image src={hero ? '/mascot/mokie-640.webp' : '/mascot/mokie-360.webp'}
      width={hero ? 640 : 360} height={hero ? 733 : 412} alt="" aria-hidden="true" priority={hero}
      sizes={hero ? '(min-width: 1024px) 250px, 220px' : '84px'}
      className={`h-auto shrink-0 object-contain drop-shadow-xl motion-reduce:animate-none ${hero ? 'mokie-float relative z-10 w-[220px] lg:w-[250px]' : 'mokie-bob w-[72px] sm:w-[84px]'}`} />
  );
}
