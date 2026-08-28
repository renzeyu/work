'use client';

import Image from 'next/image';
import {
  ArrowLeft,
  Check,
  Export,
  Plus,
  X,
} from '@phosphor-icons/react';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react';
import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { withBasePath } from '../lib/base-path';

type Theme = 'orange' | 'cream' | 'white' | 'dark';
type DetailView = 'post' | 'comment' | null;

type Scene = {
  id: string;
  label: string;
  theme: Theme;
  dome: string;
  chrome: 'light' | 'dark';
};

const scenes: Scene[] = [
  { id: 'cover', label: 'Your 2022 Reddit Recap', theme: 'orange', dome: '', chrome: 'light' },
  { id: 'bananas', label: 'Standard Banana Units scrolled', theme: 'cream', dome: 'peach', chrome: 'dark' },
  { id: 'moon', label: 'Trips to the moon', theme: 'dark', dome: 'charcoal', chrome: 'light' },
  { id: 'started-going', label: 'How it started versus how it is going', theme: 'white', dome: 'peach', chrome: 'dark' },
  { id: 'interests', label: 'Top interests', theme: 'orange', dome: 'deep-orange', chrome: 'light' },
  { id: 'entertained', label: 'How you kept yourself entertained', theme: 'cream', dome: 'peach', chrome: 'dark' },
  { id: 'alternate', label: 'Alternate universe communities', theme: 'dark', dome: 'charcoal', chrome: 'light' },
  { id: 'wholesome', label: 'Cat or dog', theme: 'white', dome: 'peach', chrome: 'dark' },
  { id: 'revisited', label: 'Most revisited post', theme: 'orange', dome: 'deep-orange', chrome: 'light' },
  { id: 'karma', label: 'Karma earned', theme: 'white', dome: 'peach', chrome: 'dark' },
  { id: 'upvotes', label: 'Where your upvotes came from', theme: 'orange', dome: 'deep-orange', chrome: 'light' },
  { id: 'top-post', label: 'Top post of the year', theme: 'cream', dome: 'peach', chrome: 'dark' },
  { id: 'top-comment', label: 'Top comment of the year', theme: 'orange', dome: 'deep-orange', chrome: 'light' },
  { id: 'joined', label: 'Communities joined', theme: 'white', dome: 'peach', chrome: 'dark' },
  { id: 'time', label: 'Time spent in communities', theme: 'cream', dome: 'peach', chrome: 'dark' },
  { id: 'ability', label: 'Secret Reddit ability', theme: 'dark', dome: 'graphite', chrome: 'light' },
  { id: 'next', label: 'Find your next community', theme: 'orange', dome: 'deep-orange', chrome: 'light' },
];

const ASSET_ROOT = withBasePath('/assets/recap2022');
const spring = { type: 'spring', stiffness: 220, damping: 21, mass: 1 } as const;
const barSpring = { type: 'spring', stiffness: 220, damping: 28, mass: 1 } as const;
const easeOut = [0.16, 1, 0.3, 1] as const;
const sceneEase = [0.4, 0, 1, 1] as const;
const textItemVariants = {
  hidden: { opacity: 0, y: '4.8cqw' },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: easeOut },
  },
};
const sceneVariants = {
  enter: { y: 0, zIndex: 1 },
  active: { y: 0, zIndex: 1 },
  exit: (direction: number) => ({
    y: direction > 0 ? '-100%' : '100%',
    zIndex: 2,
    transition: { duration: 0.28, ease: sceneEase },
  }),
};
const roundHolo = (value: number, precision = 3) => Number.parseFloat(value.toFixed(precision));
const clampHolo = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max);
const adjustHolo = (value: number, fromMin: number, fromMax: number, toMin: number, toMax: number) => (
  roundHolo(toMin + ((toMax - toMin) * (value - fromMin)) / (fromMax - fromMin))
);
const holoSpringKeys = ['rotateX', 'rotateY', 'glareX', 'glareY', 'opacity', 'backgroundX', 'backgroundY'] as const;
type HoloSpringKey = (typeof holoSpringKeys)[number];
type HoloSpringState = Record<HoloSpringKey, number>;
type HoloSpringOptions = { stiffness: number; damping: number; soft?: number };
const holoRestState: HoloSpringState = {
  rotateX: 0,
  rotateY: 0,
  glareX: 50,
  glareY: 50,
  opacity: 0,
  backgroundX: 50,
  backgroundY: 50,
};

function useHoloCardSpring() {
  const rotateX = useMotionValue(holoRestState.rotateX);
  const rotateY = useMotionValue(holoRestState.rotateY);
  const glareX = useMotionValue(holoRestState.glareX);
  const glareY = useMotionValue(holoRestState.glareY);
  const cardOpacity = useMotionValue(holoRestState.opacity);
  const backgroundX = useMotionValue(holoRestState.backgroundX);
  const backgroundY = useMotionValue(holoRestState.backgroundY);
  const tickRef = useRef<(now: number) => void>(() => undefined);
  const engine = useRef({
    value: { ...holoRestState },
    lastValue: { ...holoRestState },
    target: { ...holoRestState },
    stiffness: 0.066,
    damping: 0.25,
    precision: 0.01,
    invMass: 1,
    invMassRecoveryRate: 0,
    lastTime: 0,
    frame: null as number | null,
  });

  const publish = useCallback((value: HoloSpringState) => {
    rotateX.set(value.rotateX);
    rotateY.set(value.rotateY);
    glareX.set(value.glareX);
    glareY.set(value.glareY);
    cardOpacity.set(value.opacity);
    backgroundX.set(value.backgroundX);
    backgroundY.set(value.backgroundY);
  }, [backgroundX, backgroundY, cardOpacity, glareX, glareY, rotateX, rotateY]);

  const tick = useCallback((now: number) => {
    const currentEngine = engine.current;
    currentEngine.invMass = Math.min(currentEngine.invMass + currentEngine.invMassRecoveryRate, 1);
    const dt = ((now - currentEngine.lastTime) * 60) / 1000;
    const next = {} as HoloSpringState;
    let settled = true;

    for (const key of holoSpringKeys) {
      const current = currentEngine.value[key];
      const last = currentEngine.lastValue[key];
      const target = currentEngine.target[key];
      const delta = target - current;
      const velocity = (current - last) / (dt || 1 / 60);
      const springForce = currentEngine.stiffness * delta;
      const damper = currentEngine.damping * velocity;
      const acceleration = (springForce - damper) * currentEngine.invMass;
      const distance = (velocity + acceleration) * dt;

      if (Math.abs(distance) < currentEngine.precision && Math.abs(delta) < currentEngine.precision) {
        next[key] = target;
      } else {
        next[key] = current + distance;
        settled = false;
      }
    }

    currentEngine.lastTime = now;
    currentEngine.lastValue = currentEngine.value;
    currentEngine.value = next;
    publish(next);
    currentEngine.frame = settled ? null : requestAnimationFrame(tickRef.current);
  }, [publish]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const setSpring = useCallback((target: HoloSpringState, options: HoloSpringOptions) => {
    const currentEngine = engine.current;
    currentEngine.target = target;
    currentEngine.stiffness = options.stiffness;
    currentEngine.damping = options.damping;

    if (options.soft) {
      currentEngine.invMassRecoveryRate = 1 / (options.soft * 60);
      currentEngine.invMass = 0;
    }

    if (currentEngine.frame === null) {
      currentEngine.lastTime = performance.now();
      currentEngine.frame = requestAnimationFrame(tickRef.current);
    }
  }, []);

  useEffect(() => () => {
    if (engine.current.frame !== null) cancelAnimationFrame(engine.current.frame);
  }, []);

  return { rotateX, rotateY, glareX, glareY, cardOpacity, backgroundX, backgroundY, setSpring };
}

function Asset({ src, className, alt = '', priority = false }: { src: string; className: string; alt?: string; priority?: boolean }) {
  return (
    <div className={className}>
      <Image src={`${ASSET_ROOT}/${src}`} alt={alt} fill priority={priority} sizes="(max-width: 700px) 100vw, 576px" />
    </div>
  );
}

function Reveal({ children, className = '', delay = 0, reduced }: { children: React.ReactNode; className?: string; delay?: number; reduced: boolean }) {
  if (reduced) return <div className={className}>{children}</div>;

  const items = Children.map(children, (child, index) => {
    if (!isValidElement(child) || typeof child.type !== 'string') return child;

    const motionProps = {
      variants: textItemVariants,
      'data-motion': 'text',
      'data-motion-index': index,
    };

    switch (child.type) {
      case 'h1':
        return <motion.h1 {...(child.props as React.ComponentProps<'h1'>)} {...motionProps} />;
      case 'p':
        return <motion.p {...(child.props as React.ComponentProps<'p'>)} {...motionProps} />;
      case 'small':
        return <motion.small {...(child.props as React.ComponentProps<'small'>)} {...motionProps} />;
      case 'span':
        return <motion.span {...(child.props as React.ComponentProps<'span'>)} {...motionProps} />;
      default:
        return child;
    }
  });

  return (
    <motion.div
      className={className}
      data-motion-group="copy"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { delayChildren: delay, staggerChildren: 0.2 } },
      }}
    >
      {items}
    </motion.div>
  );
}

function PopAsset({ src, className, reduced, delay = 0.4, alt = '', priority = false }: { src: string; className: string; reduced: boolean; delay?: number; alt?: string; priority?: boolean }) {
  return (
    <motion.div
      className={className}
      data-motion="art"
      initial={reduced ? false : { opacity: 0, scale: 0.06 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...spring, delay }}
    >
      <Image src={`${ASSET_ROOT}/${src}`} alt={alt} fill priority={priority} sizes="(max-width: 700px) 100vw, 576px" />
    </motion.div>
  );
}

function CoverScene({ reduced, onNext }: { reduced: boolean; onNext: () => void }) {
  return (
    <div className="scene scene-cover">
      <PopAsset src="hero-cover.webp" className="cover-hero art" reduced={reduced} priority />
      <Reveal className="cover-copy" reduced={reduced} delay={1.05}>
        <h1>Your 2022<br />Reddit Recap</h1>
        <p className="cover-prepared">Prepared for Glittering_Knee_5016<br />Presented in BananaVision™</p>
        <p className="cover-note">Based on data up to November</p>
      </Reveal>
      <motion.button
        className="cover-next"
        type="button"
        aria-label="Continue to your recap"
        onClick={(event) => { event.stopPropagation(); onNext(); }}
        animate={reduced ? undefined : { y: [0, 6, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      ><span /></motion.button>
    </div>
  );
}

function BananasScene({ reduced }: { reduced: boolean }) {
  return (
    <div className="scene scene-bananas">
      <PopAsset src="hero-bananas.webp" className="bananas-hero art" reduced={reduced} />
      <Reveal className="metric-copy bananas-copy" reduced={reduced} delay={1.05}>
        <h1>You scrolled</h1>
        <p><span className="number-chip orange-chip">10,253</span> <strong>bananas</strong></p>
        <small>In SBU (Standard Banana Units)</small>
      </Reveal>
    </div>
  );
}

function MoonScene({ reduced }: { reduced: boolean }) {
  return (
    <div className="scene scene-moon">
      <PopAsset src="hero-moon.webp" className="moon-hero art" reduced={reduced} />
      <Reveal className="moon-copy" reduced={reduced} delay={1.05}>
        <h1>You spent enough<br />time to go to the<br />moon <span className="number-chip orange-chip">0.4</span> times</h1>
        <p>We’re glad you spent it with us</p>
      </Reveal>
    </div>
  );
}

function StartedGoingScene({ reduced }: { reduced: boolean }) {
  return (
    <div className="scene scene-started">
      <motion.div
        className="started-panel art"
        data-motion="art"
        initial={reduced ? false : { opacity: 0, scale: 0.06 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...spring, delay: 0.4 }}
      >
        <Image src={`${ASSET_ROOT}/panel-started-going-content.webp`} alt="Avatar before and after" fill sizes="576px" />
      </motion.div>
      <Reveal className="started-copy" reduced={reduced} delay={1.05}>
        <h1>How it started<br />vs how it’s going</h1>
        <p>Fashion is timely, style is timeless</p>
      </Reveal>
    </div>
  );
}

const interestRows = [
  { rank: '#1', label: 'TELEVISION', asset: 'icon-television.webp', width: '95.85cqw', color: '#fffefe' },
  { rank: '#2', label: 'HOBBIES', asset: 'icon-camera.webp', width: '82.75cqw', color: '#ffd535' },
  { rank: '#3', label: 'MOVIES', asset: 'icon-movies.webp', width: '56.28cqw', color: '#ffa800' },
] as const;

function InterestsScene({ reduced }: { reduced: boolean }) {
  return (
    <div className="scene scene-interests">
      <div className="interest-bars" aria-label="Top interests">
        {interestRows.map((row, index) => (
          <div
            className="interest-row"
            key={row.rank}
            style={{ '--row-width': row.width, '--row-color': row.color } as CSSProperties}
            data-motion-group="bars"
            data-motion-index={index}
          >
            <motion.span
              className="row-fill"
              data-motion="bar"
              initial={reduced ? false : { width: '11.37cqw', opacity: 0 }}
              animate={{ width: row.width, opacity: 1 }}
              transition={{
                width: { ...barSpring, delay: 0.4 + index * 0.11 },
                opacity: { duration: 0.08, delay: 0.4 + index * 0.11, ease: easeOut },
              }}
            />
            <motion.span
              className="interest-label"
              data-motion="text"
              data-motion-index={index}
              initial={reduced ? false : { opacity: 0, y: 'calc(-50% + 4.8cqw)' }}
              animate={{ opacity: 1, y: '-50%' }}
              transition={{ duration: 0.3, delay: 0.9 + index * 0.11, ease: easeOut }}
            ><b>{row.rank}</b><small>{row.label}</small></motion.span>
            <motion.span
              className={`interest-icon interest-icon-${index + 1} art`}
              data-motion="art"
              data-motion-index={index}
              initial={reduced ? false : { opacity: 0, scale: 0.08 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...spring, delay: 0.82 + index * 0.11 }}
            ><Image src={`${ASSET_ROOT}/${row.asset}`} alt="" fill sizes="180px" /></motion.span>
          </div>
        ))}
      </div>
      <Reveal className="interests-copy" reduced={reduced} delay={1.15}>
        <h1>These were your<br />top interests</h1>
        <p>Fun fact: the length of<br />these bars means nothing</p>
      </Reveal>
    </div>
  );
}

const timeRows = [
  { hours: '9', unit: 'HOURS', name: 'r/KamenRider', width: '94cqw', color: '#fffefe' },
  { hours: '1', unit: 'HOUR', name: 'r/Spiderman', width: '80cqw', color: '#ffd535' },
  { hours: '1', unit: 'HOUR', name: 'r/Eldenring', width: '37cqw', color: '#ffa800' },
] as const;

function BarStats({ rows, reduced, className = '' }: { rows: readonly { hours: string; unit: string; name: string; width: string; color: string }[]; reduced: boolean; className?: string }) {
  return (
    <div className={`stat-bars ${className}`}>
      {rows.map((row, index) => (
        <div
          className="stat-row"
          key={`${row.name}-${row.hours}`}
          style={{ '--stat-width': row.width, '--stat-color': row.color } as CSSProperties}
          data-motion-group="bars"
          data-motion-index={index}
        >
          <motion.span
            className="row-fill"
            data-motion="bar"
            initial={reduced ? false : { width: '11.37cqw', opacity: 0 }}
            animate={{ width: row.width, opacity: 1 }}
            transition={{
              width: { ...barSpring, delay: 0.4 + index * 0.11 },
              opacity: { duration: 0.08, delay: 0.4 + index * 0.11, ease: easeOut },
            }}
          />
          <motion.span
            className="stat-hours"
            data-motion="text"
            data-motion-index={index}
            initial={reduced ? false : { opacity: 0, y: '4.8cqw' }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.88 + index * 0.11, ease: easeOut }}
          ><b>{row.hours}</b><small>{row.unit}</small></motion.span>
          <motion.span
            className="subreddit-pill"
            data-motion="pill"
            data-motion-index={index}
            initial={reduced ? false : { opacity: 0, scale: 0.08 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...spring, delay: 0.76 + index * 0.11 }}
          ><i>r/</i>{row.name.slice(2)}</motion.span>
        </div>
      ))}
    </div>
  );
}

function EntertainedScene({ reduced }: { reduced: boolean }) {
  return (
    <div className="scene scene-entertained">
      <BarStats rows={timeRows} reduced={reduced} />
      <Reveal className="entertained-copy" reduced={reduced} delay={1.08}>
        <h1>Here’s how you<br />kept yourself<br />entertained</h1>
        <p>Now that was time well wasted</p>
      </Reveal>
    </div>
  );
}

function CommunityPills({ communities, light = false, reduced }: { communities: string[]; light?: boolean; reduced: boolean }) {
  return (
    <div className={`community-pills ${light ? 'is-light' : ''}`}>
      {communities.map((name, index) => (
        <motion.div
          className="community-pill"
          key={name}
          data-motion="pill"
          data-motion-index={index}
          initial={reduced ? false : { opacity: 0, scale: 0.08 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...spring, delay: 0.4 + index * 0.11 }}
        ><span><Plus weight="bold" /></span><i>r/</i>{name}</motion.div>
      ))}
    </div>
  );
}

function AlternateScene({ reduced }: { reduced: boolean }) {
  return (
    <div className="scene scene-alternate">
      <CommunityPills communities={['supersen…', 'SpidermanP…', 'fromsoftwa…']} reduced={reduced} />
      <Reveal className="alternate-copy" reduced={reduced} delay={1.08}>
        <h1>In an alternate<br />universe maybe<br />you’re into these</h1>
        <p>Time and space are illusions</p>
      </Reveal>
    </div>
  );
}

function WholesomeScene({ reduced }: { reduced: boolean }) {
  return (
    <div className="scene scene-wholesome">
      <PopAsset src="hero-catdog.webp" className="catdog-hero art" reduced={reduced} />
      <Reveal className="wholesome-copy" reduced={reduced} delay={1.05}>
        <h1>You’re too<br />wholesome to<br />pick sides</h1>
        <p>How adorable!</p>
      </Reveal>
    </div>
  );
}

function MediaCard({ src, className, label, onOpen, reduced }: { src: string; className: string; label: string; onOpen?: () => void; reduced: boolean }) {
  const content = (
    <motion.span
      className={`media-card art ${className}`}
      data-motion="art"
      initial={reduced ? false : { opacity: 0, scale: 0.08 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...spring, delay: 0.4 }}
    ><Image src={`${ASSET_ROOT}/${src}`} alt={label} fill sizes="500px" /></motion.span>
  );
  if (!onOpen) return content;
  return <button className="media-card-button" type="button" onClick={(event) => { event.stopPropagation(); onOpen(); }} aria-label={`Open ${label}`}>{content}</button>;
}

function RevisitedScene({ reduced }: { reduced: boolean }) {
  return (
    <div className="scene scene-revisited">
      <MediaCard src="media-revisited.webp" className="revisited-media" label="r/Neverbrokeabone post" reduced={reduced} />
      <Reveal className="revisited-copy" reduced={reduced} delay={1.05}>
        <h1>Through it all,<br />you kept coming<br />back to this post</h1>
        <p>Worth one more visit?</p>
      </Reveal>
    </div>
  );
}

function KarmaScene({ reduced }: { reduced: boolean }) {
  return (
    <div className="scene scene-karma">
      <PopAsset src="hero-karma.webp" className="karma-hero art" reduced={reduced} />
      <Reveal className="karma-copy" reduced={reduced} delay={1.05}>
        <h1>You’re in the top <span className="number-chip orange-chip">3%</span><br />of karma earners<br />this year</h1>
        <p>Which is saying something</p>
      </Reveal>
    </div>
  );
}

function UpvotesScene({ reduced }: { reduced: boolean }) {
  return (
    <div className="scene scene-upvotes">
      <PopAsset src="hero-upvotes.webp" className="upvotes-hero art" reduced={reduced} />
      <Reveal className="upvotes-copy" reduced={reduced} delay={1.05}>
        <span className="white-community"><i>r/</i>KamenRider</span>
        <h1><span className="number-chip white-chip">19%</span> of your<br />upvotes came<br />from here</h1>
        <p>Not bad</p>
      </Reveal>
    </div>
  );
}

function TopPostScene({ reduced, onOpen }: { reduced: boolean; onOpen: () => void }) {
  return (
    <div className="scene scene-top-post">
      <MediaCard src="media-top-post.webp" className="top-post-media" label="top r/cosplayers post" onOpen={onOpen} reduced={reduced} />
      <Reveal className="top-post-copy" reduced={reduced} delay={1.05}>
        <h1>Your top post<br />of this year</h1>
        <p>Drumroll please</p>
      </Reveal>
    </div>
  );
}

function TopCommentScene({ reduced, onOpen }: { reduced: boolean; onOpen: () => void }) {
  return (
    <div className="scene scene-top-comment">
      <MediaCard src="top-comment-stack.webp" className="top-comment-media" label="top r/KamenRider comment" onOpen={onOpen} reduced={reduced} />
      <Reveal className="top-comment-copy" reduced={reduced} delay={1.05}>
        <h1>Your top comment<br />this year</h1>
        <p>The internet has spoken</p>
      </Reveal>
    </div>
  );
}

function JoinedScene({ reduced }: { reduced: boolean }) {
  return (
    <div className="scene scene-joined">
      <div className="joined-chips">
        {['Damnthatsinteresting', 'announcements', 'Crystals'].map((name, index) => (
          <motion.span
            key={name}
            data-motion="pill"
            data-motion-index={index}
            initial={reduced ? false : { opacity: 0, scale: 0.08 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...spring, delay: 0.4 + index * 0.11 }}
          ><i>r/</i>{name}</motion.span>
        ))}
      </div>
      <Reveal className="joined-copy" reduced={reduced} delay={1.08}>
        <h1>This year you got<br />into new things</h1>
        <p>And joined these communities</p>
      </Reveal>
    </div>
  );
}

const communityTimeRows = [
  { hours: '10', unit: 'HOURS', name: 'r/KamenRider', width: '94cqw', color: '#fffefe' },
  { hours: '3', unit: 'HOURS', name: 'r/cosplay', width: '80cqw', color: '#ffd535' },
  { hours: '1', unit: 'HOUR', name: 'r/Spiderman', width: '37cqw', color: '#ffa800' },
] as const;

function TimeScene({ reduced }: { reduced: boolean }) {
  return (
    <div className="scene scene-time">
      <BarStats rows={communityTimeRows} reduced={reduced} className="community-time-bars" />
      <Reveal className="time-copy" reduced={reduced} delay={1.08}>
        <h1>Here’s how you<br />spent your time</h1>
        <p>And found your people</p>
      </Reveal>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" className="privacy-row" role="switch" aria-checked={checked} onClick={(event) => { event.stopPropagation(); onChange(); }}>
      <span className="privacy-alert">!</span><b>{label}</b><span className={`toggle ${checked ? 'is-on' : ''}`}><i /></span>
    </button>
  );
}

function AbilityScene({ reduced, revealed, onReveal, hideUsername, hideAvatar, setHideUsername, setHideAvatar }: { reduced: boolean; revealed: boolean; onReveal: () => void; hideUsername: boolean; hideAvatar: boolean; setHideUsername: (next: boolean) => void; setHideAvatar: (next: boolean) => void }) {
  const { rotateX, rotateY, glareX, glareY, cardOpacity, backgroundX, backgroundY, setSpring } = useHoloCardSpring();
  const rotateXDegrees = useTransform(rotateX, (value) => `${value}deg`);
  const rotateYDegrees = useTransform(rotateY, (value) => `${value}deg`);
  const glareXPercent = useTransform(glareX, (value) => `${value}%`);
  const glareYPercent = useTransform(glareY, (value) => `${value}%`);
  const backgroundXPercent = useTransform(backgroundX, (value) => `${value}%`);
  const backgroundYPercent = useTransform(backgroundY, (value) => `${value}%`);
  const pointerFromCenter = useTransform([glareX, glareY], ([x, y]) => Math.min(1, Math.hypot(x - 50, y - 50) / 50));
  const cardFrame = useRef<number | null>(null);
  const cardResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCardPointer = useRef<{
    percentX: number;
    percentY: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  useEffect(() => () => {
    if (cardFrame.current !== null) cancelAnimationFrame(cardFrame.current);
    if (cardResetTimer.current !== null) clearTimeout(cardResetTimer.current);
  }, []);

  const resetCardTilt = (delay = 500) => {
    if (cardFrame.current !== null) cancelAnimationFrame(cardFrame.current);
    cardFrame.current = null;
    pendingCardPointer.current = null;
    if (cardResetTimer.current !== null) clearTimeout(cardResetTimer.current);
    cardResetTimer.current = setTimeout(() => {
      setSpring({ ...holoRestState }, { stiffness: 0.01, damping: 0.06, soft: 1 });
      cardResetTimer.current = null;
    }, delay);
  };

  const handleCardPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reduced || event.pointerType === 'touch') return;
    if (cardResetTimer.current !== null) {
      clearTimeout(cardResetTimer.current);
      cardResetTimer.current = null;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const percentX = clampHolo(roundHolo((100 / bounds.width) * (event.clientX - bounds.left)));
    const percentY = clampHolo(roundHolo((100 / bounds.height) * (event.clientY - bounds.top)));
    const centerX = percentX - 50;
    const centerY = percentY - 50;

    pendingCardPointer.current = {
      percentX,
      percentY,
      centerX,
      centerY,
    };

    if (cardFrame.current !== null) return;
    cardFrame.current = requestAnimationFrame(() => {
      const pointer = pendingCardPointer.current;
      if (pointer) {
        setSpring({
          rotateX: roundHolo(-(pointer.centerX / 3.5)),
          rotateY: roundHolo(pointer.centerY / 3.5),
          glareX: roundHolo(pointer.percentX),
          glareY: roundHolo(pointer.percentY),
          opacity: 1,
          backgroundX: adjustHolo(pointer.percentX, 0, 100, 37, 63),
          backgroundY: adjustHolo(pointer.percentY, 0, 100, 33, 67),
        }, { stiffness: 0.066, damping: 0.25 });
      }
      pendingCardPointer.current = null;
      cardFrame.current = null;
    });
  };

  const cardMotionStyle = {
    '--pointer-x': glareXPercent,
    '--pointer-y': glareYPercent,
    '--pointer-from-center': pointerFromCenter,
    '--card-opacity': cardOpacity,
    '--rotate-x': rotateXDegrees,
    '--rotate-y': rotateYDegrees,
    '--background-x': backgroundXPercent,
    '--background-y': backgroundYPercent,
  };

  return (
    <div className="scene scene-ability">
      <motion.div
        className="ability-entry"
        data-motion="art"
        initial={reduced ? false : { opacity: 0, scale: 0.06 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...spring, delay: 0.4 }}
      >
        <div className={`ability-flip ${revealed ? 'is-revealed' : ''}`}>
        <button
          className="ability-face ability-back"
          type="button"
          aria-label="Reveal your secret Reddit ability"
          aria-hidden={revealed}
          disabled={revealed}
          onClick={(event) => { event.stopPropagation(); onReveal(); }}
        >
          <span className="reddit-corner art"><Image src={`${ASSET_ROOT}/ability-logo-corner.webp`} alt="" fill sizes="110px" /></span>
          <span className="question-art art"><Image src={`${ASSET_ROOT}/icon-question.webp`} alt="" fill sizes="200px" /></span>
          <strong>What’s your secret<br />Reddit ability?</strong>
          <small>Tap to reveal</small>
        </button>
        <motion.div
          className="ability-face ability-front"
          initial={reduced ? false : undefined}
          aria-hidden={!revealed}
        >
          <motion.div className="ability-holo-card" style={cardMotionStyle}>
            <div className="ability-translater">
              <div className="ability-tilt">
                <div className="ability-card-front">
                  <Asset src="ability-card.webp" className="ability-card art" alt="Glittering_Knee_5016 rare Reddit ability card" />
                  <span className="ability-shine" aria-hidden="true" />
                  <span className="ability-glare" aria-hidden="true" />
                  {hideUsername && <span className="ability-mask mask-username">Hidden for sharing</span>}
                  {hideAvatar && <span className="ability-mask mask-avatar">Avatar hidden</span>}
                </div>
              </div>
            </div>
          </motion.div>
          <div
            className="ability-hit-plane"
            aria-hidden="true"
            onPointerEnter={handleCardPointerMove}
            onPointerMove={handleCardPointerMove}
            onPointerLeave={() => resetCardTilt()}
            onPointerCancel={() => resetCardTilt()}
          />
        </motion.div>
        </div>
      </motion.div>
      <AnimatePresence>
        {revealed && (
          <motion.div className="privacy-controls" initial={reduced ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <Toggle label="Hide username" checked={hideUsername} onChange={() => setHideUsername(!hideUsername)} />
            <Toggle label="Hide avatar" checked={hideAvatar} onChange={() => setHideAvatar(!hideAvatar)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NextScene({ reduced }: { reduced: boolean }) {
  return (
    <div className="scene scene-next">
      <CommunityPills communities={['witch…', 'comicboo…', 'interestingasfu…']} light reduced={reduced} />
      <Reveal className="next-copy" reduced={reduced} delay={1.08}>
        <h1>Find your next<br />community</h1>
        <p>And stay <u>in the loop</u></p>
      </Reveal>
    </div>
  );
}

function SceneContent({ current, reduced, onNext, onDetail, ability }: { current: number; reduced: boolean; onNext: () => void; onDetail: (detail: DetailView) => void; ability: { revealed: boolean; reveal: () => void; hideUsername: boolean; hideAvatar: boolean; setHideUsername: (value: boolean) => void; setHideAvatar: (value: boolean) => void } }) {
  switch (current) {
    case 0: return <CoverScene reduced={reduced} onNext={onNext} />;
    case 1: return <BananasScene reduced={reduced} />;
    case 2: return <MoonScene reduced={reduced} />;
    case 3: return <StartedGoingScene reduced={reduced} />;
    case 4: return <InterestsScene reduced={reduced} />;
    case 5: return <EntertainedScene reduced={reduced} />;
    case 6: return <AlternateScene reduced={reduced} />;
    case 7: return <WholesomeScene reduced={reduced} />;
    case 8: return <RevisitedScene reduced={reduced} />;
    case 9: return <KarmaScene reduced={reduced} />;
    case 10: return <UpvotesScene reduced={reduced} />;
    case 11: return <TopPostScene reduced={reduced} onOpen={() => onDetail('post')} />;
    case 12: return <TopCommentScene reduced={reduced} onOpen={() => onDetail('comment')} />;
    case 13: return <JoinedScene reduced={reduced} />;
    case 14: return <TimeScene reduced={reduced} />;
    case 15: return <AbilityScene reduced={reduced} revealed={ability.revealed} onReveal={ability.reveal} hideUsername={ability.hideUsername} hideAvatar={ability.hideAvatar} setHideUsername={ability.setHideUsername} setHideAvatar={ability.setHideAvatar} />;
    default: return <NextScene reduced={reduced} />;
  }
}

function RecapSceneLayer({ scene, current, direction, reduced, onNext, onPrevious, onDetail, ability }: {
  scene: Scene;
  current: number;
  direction: number;
  reduced: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onDetail: (detail: DetailView) => void;
  ability: { revealed: boolean; reveal: () => void; hideUsername: boolean; hideAvatar: boolean; setHideUsername: (value: boolean) => void; setHideAvatar: (value: boolean) => void };
}) {
  const dragY = useMotionValue(0);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const dragAxis = useRef<'pending' | 'vertical' | 'horizontal' | null>(null);

  const resetDrag = () => {
    pointerStart.current = null;
    dragAxis.current = null;
    animate(dragY, 0, { type: 'spring', stiffness: 430, damping: 36 });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, [data-no-scene-drag]')) return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
    dragAxis.current = 'pending';
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    if (dragAxis.current === 'pending' && Math.hypot(dx, dy) > 7) {
      dragAxis.current = Math.abs(dy) > Math.abs(dx) ? 'vertical' : 'horizontal';
    }
    if (!reduced && dragAxis.current === 'vertical') dragY.set(dy);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    const axis = dragAxis.current;
    pointerStart.current = null;
    dragAxis.current = null;
    if (!start || axis !== 'vertical') {
      animate(dragY, 0, { type: 'spring', stiffness: 430, damping: 36 });
      return;
    }

    const dy = event.clientY - start.y;
    const threshold = Math.min(64, event.currentTarget.getBoundingClientRect().height * 0.1);
    if (dy <= -threshold && current < scenes.length - 1) onNext();
    else if (dy >= threshold && current > 0) onPrevious();
    else animate(dragY, 0, { type: 'spring', stiffness: 430, damping: 36 });
  };

  return (
    <motion.article
      className="scene-layer"
      custom={direction}
      initial={reduced ? false : 'enter'}
      animate="active"
      exit={reduced ? undefined : 'exit'}
      variants={sceneVariants}
      aria-label={scene.label}
    >
      <motion.div
        className="scene-drag-layer"
        style={{ y: dragY }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={resetDrag}
      >
        <SceneContent current={current} reduced={reduced} onNext={onNext} onDetail={onDetail} ability={ability} />
      </motion.div>
    </motion.article>
  );
}

function StatusBar({ light }: { light: boolean }) {
  return (
    <div className={`status-bar ${light ? 'is-light' : ''}`} aria-hidden="true">
      <Image className="status-bar-art" src={`${ASSET_ROOT}/status-bar.svg`} alt="" fill priority sizes="414px" />
    </div>
  );
}

function DotRail({ current, onGoTo, light }: { current: number; onGoTo: (index: number) => void; light: boolean }) {
  const visible = useMemo(() => {
    const start = Math.max(0, Math.min(current - 3, scenes.length - 8));
    return scenes.slice(start, start + 8).map((scene, offset) => ({ scene, index: start + offset, offset }));
  }, [current]);
  return (
    <nav className={`dot-rail ${light ? 'is-light' : ''}`} aria-label={`Recap scene ${current + 1} of ${scenes.length}`}>
      {visible.map(({ scene, index, offset }) => {
        const edge = (offset === 0 && index > 0) || (offset === 7 && index < scenes.length - 1);
        return <button type="button" key={scene.id} className={`${index === current ? 'is-current' : ''} ${edge ? 'is-edge' : ''}`} onClick={(event) => { event.stopPropagation(); onGoTo(index); }} aria-label={`Go to ${scene.label}`} aria-current={index === current ? 'step' : undefined} />;
      })}
    </nav>
  );
}

function ShareChrome({ dome, light, status, onShare }: { dome: string; light: boolean; status: 'idle' | 'copied' | 'shared' | 'error'; onShare: () => void }) {
  return (
    <>
      <motion.div className={`share-dome dome-${dome}`} aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: 'linear' }} />
      <motion.button className={`share-button ${light ? 'is-light' : ''}`} type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.38, delay: 0.12, ease: 'linear' }} onClick={(event) => { event.stopPropagation(); onShare(); }}>
        <span>{status === 'copied' || status === 'shared' ? <Check weight="bold" /> : <Export weight="regular" />}</span>
        <b>{status === 'copied' ? 'Link copied' : status === 'shared' ? 'Recap shared' : status === 'error' ? 'Sharing unavailable' : 'Share your recap'}</b>
      </motion.button>
    </>
  );
}

function DetailOverlay({ detail, onBack }: { detail: Exclude<DetailView, null>; onBack: () => void }) {
  return (
    <motion.div className="detail-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Image src={`${ASSET_ROOT}/${detail === 'post' ? 'detail-post.webp' : 'detail-comment.webp'}`} alt={detail === 'post' ? 'Opened r/cosplayers post' : 'Opened r/KamenRider comment thread'} fill priority sizes="576px" />
      <button type="button" className="detail-back" aria-label="Back to recap" onClick={onBack}><ArrowLeft weight="bold" /></button>
    </motion.div>
  );
}

export function RedditRecapPrototype() {
  const prefersReducedMotion = useReducedMotion();
  const reduced = Boolean(prefersReducedMotion);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [detail, setDetail] = useState<DetailView>(null);
  const [closed, setClosed] = useState(true);
  const [sheetMounted, setSheetMounted] = useState(false);
  const [feedInteractive, setFeedInteractive] = useState(true);
  const [openCycle, setOpenCycle] = useState(0);
  const [abilityRevealed, setAbilityRevealed] = useState(false);
  const [hideUsername, setHideUsername] = useState(false);
  const [hideAvatar, setHideAvatar] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared' | 'error'>('idle');
  const currentRef = useRef(0);
  const navigationLocked = useRef(false);
  const navigationUnlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelLocked = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scene = scenes[current];
  const light = scene.chrome === 'light';

  const goTo = useCallback((nextIndex: number, interrupt = false) => {
    const bounded = Math.max(0, Math.min(scenes.length - 1, nextIndex));
    const previousIndex = currentRef.current;
    if (bounded === previousIndex || (navigationLocked.current && !interrupt)) return;

    currentRef.current = bounded;
    navigationLocked.current = true;
    setDirection(bounded > previousIndex ? 1 : -1);
    setCurrent(bounded);
    if (navigationUnlockTimer.current) clearTimeout(navigationUnlockTimer.current);
    navigationUnlockTimer.current = setTimeout(() => {
      navigationLocked.current = false;
      navigationUnlockTimer.current = null;
    }, 380);
  }, []);

  const next = useCallback(() => goTo(currentRef.current + 1), [goTo]);
  const previous = useCallback(() => goTo(currentRef.current - 1), [goTo]);
  const jumpTo = useCallback((nextIndex: number) => goTo(nextIndex, true), [goTo]);
  const openRecap = useCallback(() => {
    if (!feedInteractive) return;
    setFeedInteractive(false);
    setSheetMounted(true);
    setOpenCycle((cycle) => cycle + 1);
    setClosed(false);
  }, [feedInteractive]);
  const closeRecap = useCallback(() => {
    setFeedInteractive(false);
    setDetail(null);
    setClosed(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (detail) {
        if (event.key === 'Escape' || event.key === 'ArrowLeft') setDetail(null);
        return;
      }
      if (closed) {
        if (event.key === 'Enter') openRecap();
        return;
      }
      if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(event.key)) {
        event.preventDefault();
        next();
      }
      if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key)) {
        event.preventDefault();
        previous();
      }
      if (event.key === 'Escape') closeRecap();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closed, closeRecap, detail, next, openRecap, previous]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (navigationUnlockTimer.current) clearTimeout(navigationUnlockTimer.current);
  }, []);

  const handleWheel = (event: ReactWheelEvent<HTMLElement>) => {
    if (closed || detail || wheelLocked.current || Math.abs(event.deltaY) < 18) return;
    wheelLocked.current = true;
    if (event.deltaY > 0) next();
    else previous();
    window.setTimeout(() => { wheelLocked.current = false; }, 620);
  };

  const handleShare = async () => {
    const payload = { title: 'Your 2022 Reddit Recap', text: 'Glittering_Knee_5016’s 2022 Reddit Recap, presented in BananaVision™.', url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(payload);
        setShareStatus('shared');
      } else {
        await navigator.clipboard.writeText(`${payload.text} ${payload.url}`);
        setShareStatus('copied');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareStatus('error');
    }
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setShareStatus('idle'), 2200);
  };

  return (
    <main className="recap-shell reddit-prototype-page">
      <section
        className={`recap-stage theme-${scene.theme} chrome-${scene.chrome}`}
        aria-label="Reddit Recap 2022 prototype"
        onWheel={handleWheel}
      >
        <div className="feed-screen" aria-hidden={!closed}>
          <Image className="closed-screen-feed" src={`${ASSET_ROOT}/exit-feed.webp`} alt="Reddit home feed" fill priority sizes="576px" />
          <span className="closed-screen-status-mask" aria-hidden="true" />
          <span className="feed-screen-home-mask" aria-hidden="true" />
          <button type="button" aria-label="Open your 2022 Reddit Recap" disabled={!feedInteractive} tabIndex={feedInteractive ? 0 : -1} onClick={openRecap} />
        </div>

        <motion.div
          className={`recap-sheet ${closed ? 'is-closed' : ''}`}
          key={openCycle}
          initial={reduced ? false : { y: '100%' }}
          animate={{ y: closed ? '100%' : '0%' }}
          transition={reduced
            ? { duration: 0 }
            : { type: 'spring', stiffness: 331, damping: 36.4, mass: 1 }}
          aria-hidden={closed}
          inert={closed}
          onAnimationComplete={() => {
            if (closed) {
              setFeedInteractive(true);
              setSheetMounted(false);
            }
          }}
        >
          {sheetMounted && <>
            <AnimatePresence initial={false} custom={direction} mode="sync">
              <RecapSceneLayer
                key={scene.id}
                scene={scene}
                current={current}
                direction={direction}
                reduced={reduced}
                onNext={next}
                onPrevious={previous}
                onDetail={setDetail}
                ability={{ revealed: abilityRevealed, reveal: () => setAbilityRevealed(true), hideUsername, hideAvatar, setHideUsername, setHideAvatar }}
              />
            </AnimatePresence>

            {!detail && (
              <>
                <button className={`close-button ${current === 15 ? 'is-bare' : ''}`} type="button" aria-label="Close recap" onClick={(event) => { event.stopPropagation(); closeRecap(); }}><X weight="light" /></button>
                <DotRail current={current} onGoTo={jumpTo} light={light} />
                {current > 0 && <ShareChrome dome={scene.dome} light={light} status={shareStatus} onShare={() => void handleShare()} />}
                <p className="sr-only" aria-live="polite">{scene.label}. Scene {current + 1} of {scenes.length}.</p>
              </>
            )}

            <AnimatePresence>{detail && <DetailOverlay detail={detail} onBack={() => setDetail(null)} />}</AnimatePresence>
          </>}
        </motion.div>

        <StatusBar light={closed ? true : light} />
        <div className={`home-indicator ${closed || light ? 'is-light' : ''}`} aria-hidden="true" />
      </section>
      <p className="desktop-hint">{closed ? 'Tap the recap banner to open' : 'Swipe up to continue · use arrow keys on desktop'}</p>
    </main>
  );
}
