"use client";

import {
  CheckCircle,
  ImageSquare,
  SpeakerHigh,
} from "@phosphor-icons/react";
import {
  AnimatePresence,
  LayoutGroup,
  animate,
  motion,
  type MotionStyle,
  type MotionValue,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import Image from "next/image";
import {
  type CSSProperties,
  type FormEvent,
  type RefObject,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { withBasePath } from "../lib/base-path";
import styles from "./RedditSeamlessPrototype.module.css";

type Screen = "feed" | "detail" | "viewer";
type MediaKind = "gif" | "image";
type PlaybackRate = 1 | 0.25;
type ViewerEntryMode = "media" | "sticky";

type RelativeRect = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

type FeedPostOrigin = {
  article: HTMLElement | null;
  media: HTMLElement | null;
};

type PostIdentityRects = {
  avatar: RelativeRect;
  community: RelativeRect;
  title: RelativeRect;
};

type DetailIdentityMotion = {
  author: MotionStyle;
  avatar: MotionStyle;
  community: MotionStyle;
  title: MotionStyle;
};

type FeedDetailTransition = {
  canvasOffset?: number;
  capturedAt: number;
  commentsFirst: boolean;
  direction: "opening" | "closing";
  mediaTime?: number;
  playbackRate: PlaybackRate;
  postId: string;
  sourceArticle: RelativeRect;
  sourceIdentity?: PostIdentityRects;
  sourceMedia?: RelativeRect;
  surfaceHeight: number;
  surfaceWidth: number;
  targetIdentity?: PostIdentityRects;
  token: number;
};

type ViewerCloseTransition = {
  capturedAt: number;
  entryMode: ViewerEntryMode;
  originPostId: string;
  playbackRate: PlaybackRate;
  sourceMedia?: RelativeRect;
  sourceMediaTime?: number;
  sourcePostId: string;
  targetMedia?: RelativeRect;
  targetMediaTime?: number;
  token: number;
};

type ViewerOpenTransition = {
  capturedAt: number;
  entryMode: "media";
  playbackRate: PlaybackRate;
  postId: string;
  sourceMedia?: RelativeRect;
  sourceMediaTime?: number;
  targetMedia?: RelativeRect;
  token: number;
};

type PostMediaData = {
  alt: string;
  kind: MediaKind;
  poster?: string;
  src: string;
  videoSrc?: string;
};

type Post = {
  author: string;
  avatarSrc: string;
  comments: number;
  community: string;
  id: string;
  media?: PostMediaData;
  title: string;
  time: string;
  votes: number;
};

type Comment = {
  age: string;
  author: string;
  avatarSrc: string;
  body: string;
  depth?: number;
  id: string;
  score: number;
};

type RedditIconName =
  | "addSquare"
  | "admin"
  | "chat"
  | "comment"
  | "communities"
  | "downvote"
  | "homeFill"
  | "notifications"
  | "overflow"
  | "pauseFill"
  | "playFill"
  | "reply"
  | "search"
  | "share"
  | "upvote"
  | "upvoteFill"
  | "volumeOffFill";

const redditIconPaths: Record<RedditIconName, string[]> = {
  addSquare: [
    "M14.7 2H5.3C3.481 2 2 3.48 2 5.3v9.4C2 16.519 3.48 18 5.3 18h9.4c1.819 0 3.3-1.48 3.3-3.3V5.3C18 3.481 16.52 2 14.7 2Zm1.499 12.7a1.5 1.5 0 01-1.499 1.499H5.3A1.5 1.5 0 013.801 14.7V5.3A1.5 1.5 0 015.3 3.801h9.4A1.5 1.5 0 0116.199 5.3v9.4ZM14 10.9h-3.1V14H9.1v-3.1H6V9.1h3.1V6h1.8v3.1H14v1.8Z",
  ],
  admin: [
    "M17.012 6.507v-.002c-.662 0-1.272.24-1.76.643-1.202-.8-2.7-1.31-4.333-1.455.048-.704.259-1.227.664-1.568.403-.34.967-.485 1.493-.534.329.429.84.71 1.423.71a1.8 1.8 0 10-1.664-2.484c-.785.08-1.675.315-2.403.923-.82.686-1.244 1.688-1.305 2.95-1.65.142-3.161.657-4.374 1.465a2.75 2.75 0 00-1.766-.648C1.393 6.506.1 7.896.1 9.61c0 1.244.68 2.316 1.663 2.812.095 3.604 3.749 6.504 8.244 6.504 4.495 0 8.153-2.903 8.244-6.51.975-.5 1.649-1.567 1.649-2.804 0-1.715-1.293-3.105-2.888-3.105v-.001Zm-.534 4.793-.027 1.07c-.066 2.622-2.957 4.755-6.444 4.755s-6.375-2.131-6.444-4.751l-.03-1.075-.96-.484c-.41-.206-.673-.68-.673-1.204 0-.72.488-1.305 1.088-1.305.278 0 .487.126.614.232l1.032.859 1.118-.745C6.79 7.959 8.07 7.547 9.455 7.458l.993-.013c1.419.074 2.735.489 3.807 1.202l1.114.74 1.03-.852a.97.97 0 01.55-.228h.062c.6 0 1.088.585 1.088 1.305 0 .522-.263.994-.67 1.202l-.951.486Z",
  ],
  chat: ["M10 1a9 9 0 00-9 9c0 1.947.79 3.58 1.935 4.957L.231 17.661A.784.784 0 00.785 19H10a9 9 0 009-9 9 9 0 00-9-9Zm0 16.2H6.162c-.994.004-1.907.053-3.045.144l-.076-.188a36.981 36.981 0 002.328-2.087l-1.05-1.263C3.297 12.576 2.8 11.331 2.8 10c0-3.97 3.23-7.2 7.2-7.2s7.2 3.23 7.2 7.2-3.23 7.2-7.2 7.2Zm5.2-7.2a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0Zm-4 0a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0Zm-4 0a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0Z"],
  comment: ["M10 1a9 9 0 00-9 9c0 1.947.79 3.58 1.935 4.957L.231 17.661A.784.784 0 00.785 19H10a9 9 0 009-9 9 9 0 00-9-9Zm0 16.2H6.162c-.994.004-1.907.053-3.045.144l-.076-.188a36.981 36.981 0 002.328-2.087l-1.05-1.263C3.297 12.576 2.8 11.331 2.8 10c0-3.97 3.23-7.2 7.2-7.2s7.2 3.23 7.2 7.2-3.23 7.2-7.2 7.2Z"],
  communities: ["M15 12.05c1.08 0 1.95.87 1.95 1.95s-.87 1.95-1.95 1.95-1.95-.87-1.95-1.95.87-1.95 1.95-1.95Zm0-1.8c-2.07 0-3.75 1.68-3.75 3.75 0 2.07 1.68 3.75 3.75 3.75 2.07 0 3.75-1.68 3.75-3.75 0-2.07-1.68-3.75-3.75-3.75ZM5 12.05c1.08 0 1.95.87 1.95 1.95S6.08 15.95 5 15.95 3.05 15.08 3.05 14s.87-1.95 1.95-1.95Zm0-1.8c-2.07 0-3.75 1.68-3.75 3.75 0 2.07 1.68 3.75 3.75 3.75 2.07 0 3.75-1.68 3.75-3.75 0-2.07-1.68-3.75-3.75-3.75ZM10 4.05c1.08 0 1.95.87 1.95 1.95S11.08 7.95 10 7.95 8.05 7.08 8.05 6 8.92 4.05 10 4.05Zm0-1.8C7.93 2.25 6.25 3.93 6.25 6c0 2.07 1.68 3.75 3.75 3.75 2.07 0 3.75-1.68 3.75-3.75 0-2.07-1.68-3.75-3.75-3.75Z"],
  downvote: ["M10 1a3.966 3.966 0 013.96 3.962V9.02h3.202c.706 0 1.335.42 1.605 1.073.27.652.122 1.396-.377 1.895l-7.754 7.759a.925.925 0 01-1.272 0l-7.754-7.76a1.734 1.734 0 01-.376-1.894c.27-.652.9-1.073 1.605-1.073h3.202V4.962A3.965 3.965 0 0110 1Zm7.01 9.82h-4.85V5.09c0-1.13-.81-2.163-1.934-2.278a2.163 2.163 0 00-2.386 2.15v5.859H2.989l7.01 7.016 7.012-7.016Z"],
  homeFill: ["M17.875 8.525a1.584 1.584 0 00-.35-.52L11.13 1.653a1.602 1.602 0 00-2.264 0L2.47 8.005a1.604 1.604 0 00-.473 1.135v6.374a3.3 3.3 0 003.3 3.3h3.7V12h2v6.814h3.7a3.3 3.3 0 003.3-3.3V9.14c0-.211-.042-.42-.123-.615h.001Z"],
  notifications: ["m18.176 14.218-.925-1.929a2.577 2.577 0 01-.25-1.105V8c0-3.86-3.142-7-7-7-3.86 0-7 3.14-7 7v3.184c0 .38-.088.762-.252 1.105l-.927 1.932A1.103 1.103 0 002.82 15.8h3.26A4.007 4.007 0 0010 19a4.008 4.008 0 003.918-3.2h3.26a1.1 1.1 0 00.934-.514 1.1 1.1 0 00.062-1.068h.002ZM10 17.2c-.93 0-1.722-.583-2.043-1.4h4.087a2.197 2.197 0 01-2.043 1.4ZM3.925 14l.447-.933c.28-.584.43-1.235.43-1.883V8c0-2.867 2.331-5.2 5.198-5.2A5.205 5.205 0 0115.2 8v3.184c0 .648.147 1.299.428 1.883l.447.933H3.925Z"],
  overflow: ["M16 11.75a1.75 1.75 0 11.001-3.501A1.75 1.75 0 0116 11.75ZM11.75 10a1.75 1.75 0 10-3.501.001A1.75 1.75 0 0011.75 10Zm-6 0a1.75 1.75 0 10-3.501.001A1.75 1.75 0 005.75 10Z"],
  pauseFill: ["M8.6 5.3a3.3 3.3 0 10-6.6 0v9.4a3.3 3.3 0 006.6 0V5.3ZM18 5.3a3.3 3.3 0 00-6.6 0v9.4a3.3 3.3 0 006.6 0V5.3Z"],
  playFill: ["M6.348 1.5c-1.66 0-3.2 1.32-3.2 3.2v10.6c0 1.87 1.54 3.2 3.2 3.2.57 0 1.16-.16 1.7-.5l8.32-5.3c1.97-1.25 1.97-4.13 0-5.39L8.048 2c-.54-.35-1.13-.5-1.7-.5Z"],
  reply: ["M12.092 7.095H4.068l4.557-4.562a.898.898 0 00-1.27-1.27L1.26 7.355a.9.9 0 000 1.27l6.096 6.103c.18.18.41.26.64.26.229 0 .459-.09.639-.26a.9.9 0 000-1.27L4.078 8.896h8.024a5.108 5.108 0 015.097 5.102V18.1c0 .5.4.9.9.9.499 0 .899-.4.899-.9v-4.102c0-3.802-3.098-6.903-6.896-6.903h-.01Z"],
  search: ["m18.736 17.464-3.483-3.483A7.961 7.961 0 0016.999 9 8 8 0 109 17a7.961 7.961 0 004.981-1.746l3.483 3.483a.9.9 0 101.272-1.273ZM9 15.2A6.207 6.207 0 012.8 9c0-3.419 2.781-6.2 6.2-6.2s6.2 2.781 6.2 6.2-2.781 6.2-6.2 6.2Z"],
  share: ["m12.8 17.524 6.89-6.887a.9.9 0 000-1.273L12.8 2.477a1.64 1.64 0 00-1.782-.349 1.64 1.64 0 00-1.014 1.518v2.593C4.054 6.728 1.192 12.075 1 17.376a1.353 1.353 0 00.862 1.32 1.35 1.35 0 001.531-.364l.334-.381c1.705-1.944 3.323-3.791 6.277-4.103v2.509c0 .667.398 1.262 1.014 1.518a1.638 1.638 0 001.783-.349v-.002Zm-.994-1.548V12h-.9c-3.969 0-6.162 2.1-8.001 4.161.514-4.011 2.823-8.16 8-8.16h.9V4.024L17.784 10l-5.977 5.976Z"],
  upvote: ["M10 19a3.966 3.966 0 01-3.96-3.962V10.98H2.838a1.731 1.731 0 01-1.605-1.073 1.734 1.734 0 01.377-1.895L9.364.254a.925.925 0 011.272 0l7.754 7.759c.498.499.646 1.242.376 1.894-.27.652-.9 1.073-1.605 1.073h-3.202v4.058A3.965 3.965 0 019.999 19H10ZM2.989 9.179H7.84v5.731c0 1.13.81 2.163 1.934 2.278a2.163 2.163 0 002.386-2.15V9.179h4.851L10 2.163 2.989 9.179Z"],
  upvoteFill: ["M10 19a3.966 3.966 0 01-3.96-3.962V10.98H2.838a1.731 1.731 0 01-1.605-1.073 1.734 1.734 0 01.377-1.895L9.364.254a.925.925 0 011.272 0l7.754 7.759c.498.499.646 1.242.376 1.894-.27.652-.9 1.073-1.605 1.073h-3.202v4.058A3.965 3.965 0 019.999 19H10Z"],
  volumeOffFill: ["M19.63 11.863a.9.9 0 11-1.274 1.273l-1.863-1.863-1.863 1.863a.897.897 0 01-1.274 0 .9.9 0 010-1.273L15.22 10l-1.863-1.863a.9.9 0 111.273-1.273l1.863 1.863 1.863-1.863a.9.9 0 111.273 1.273L17.765 10l1.863 1.863h.002ZM9.126 1.5c-.336 0-.68.098-.993.316L2.251 5.897c-2.865 1.988-2.865 6.219 0 8.207l5.881 4.081c.313.217.658.316.993.316.91 0 1.757-.721 1.757-1.752V3.252c0-1.031-.848-1.752-1.757-1.752h.001Z"],
};

function RedditIcon({ className, name, size = 20 }: { className?: string; name: RedditIconName; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="currentColor"
      focusable="false"
      aria-hidden="true"
    >
      {redditIconPaths[name].map((path) => <path key={path} d={path} />)}
    </svg>
  );
}

type IOSIconName =
  | "chevronDown"
  | "close"
  | "ellipsis"
  | "menu"
  | "search"
  | "sliders";

function IOSIcon({ className, name, size = 24 }: { className?: string; name: IOSIconName; size?: number }) {
  const sharedProps = {
    className,
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    focusable: "false" as const,
    "aria-hidden": true,
  };

  if (name === "ellipsis") {
    return (
      <svg {...sharedProps} fill="currentColor">
        <circle cx="5.5" cy="12" r="1.45" />
        <circle cx="12" cy="12" r="1.45" />
        <circle cx="18.5" cy="12" r="1.45" />
      </svg>
    );
  }

  if (name === "sliders") {
    return (
      <svg
        {...sharedProps}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3.5 6.25h5.2m4.6 0h7.2M3.5 12h10.2m4.6 0h2.2M3.5 17.75h2.2m4.6 0h10.2" />
        <circle cx="11" cy="6.25" r="2" fill="currentColor" stroke="none" />
        <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none" />
        <circle cx="8" cy="17.75" r="2" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  const paths: Record<Exclude<IOSIconName, "ellipsis" | "sliders">, string> = {
    chevronDown: "m7.5 9.5 4.5 4.5 4.5-4.5",
    close: "m6.25 6.25 11.5 11.5m0-11.5-11.5 11.5",
    menu: "M4 6.25h16M4 12h16M4 17.75h16",
    search: "M15.45 15.45 20.1 20.1",
  };

  return (
    <svg
      {...sharedProps}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      shapeRendering="geometricPrecision"
    >
      {name === "search" ? <circle cx="10.6" cy="10.6" r="6.45" /> : null}
      <path d={paths[name]} />
    </svg>
  );
}

const defaultAvatarBase = "https://www.redditstatic.com/avatars/defaults/v2";

const posts: Post[] = [
  {
    id: "summit",
    community: "r/MadeMeSmile",
    author: "stillinmotion",
    time: "6h",
    avatarSrc: "https://styles.redditmedia.com/t5_2uqcm/styles/communityIcon_kfqpkjbvpv001.png?width=256&s=3405a74675107554c9f9543c805d46c53fa12006",
    title: "Still in love after 45 years together!",
    media: {
      src: "/reddit-seamless/couple.jpg",
      alt: "A couple dressed formally and standing together at a celebration",
      kind: "image",
    },
    votes: 9700,
    comments: 75,
  },
  {
    id: "ask",
    community: "r/AskReddit",
    author: "randomwonderer",
    time: "7h",
    avatarSrc: "https://styles.redditmedia.com/t5_2qh1i/styles/communityIcon_p6kb2m6b185b1.png?width=256&s=c28b9f038c305e139b62739f2133d7b776582696",
    title: "What dark secret are you hiding from everyone?",
    votes: 50000,
    comments: 30000,
  },
  {
    id: "kitten",
    community: "r/aww",
    author: "J0ffreigh",
    time: "8h",
    avatarSrc: "https://styles.redditmedia.com/t5_2qh1o/styles/communityIcon_uz6ge49x9h6e1.png?width=256&s=2d5ce60e532e3b04255eaeec63764bf34601532e",
    title: "For the first time, one of our kittens climbed out of their box today.",
    media: {
      src: "/reddit-seamless/kitten.gif",
      videoSrc: "/reddit-seamless/kitten.mp4",
      poster: "/reddit-seamless/kitten-poster.jpg",
      alt: "A black cat enthusiastically typing on a laptop",
      kind: "gif",
    },
    votes: 47000,
    comments: 460,
  },
  {
    id: "tickets",
    community: "r/Adelaide",
    author: "papertrail88",
    time: "9h",
    avatarSrc: "https://styles.redditmedia.com/t5_2r1ca/styles/communityIcon_squ3vhwwy4eh1.jpg?width=256&s=79c10083b8cb0eb405838390c5c0cd40b1f0bc7f",
    title: "The end of an era, paper tickets through the decades",
    media: {
      src: "/reddit-seamless/tickets.jpg",
      alt: "A dramatic station interior used as a placeholder for a ticket collection",
      kind: "image",
    },
    votes: 12200,
    comments: 208,
  },
  {
    id: "ralph",
    community: "r/CasualUK",
    author: "MillionMoons2",
    time: "3h",
    avatarSrc: "https://styles.redditmedia.com/t5_3j2jr/styles/communityIcon_6vucgynho4u91.jpg?width=256&s=9dd5cb0a5b2831a6fb839958b9be769fde6c9a75",
    title: "Golden hour last night with Ralph on the Orkney Islands",
    media: {
      src: "/reddit-seamless/dog-wind.gif",
      videoSrc: "/reddit-seamless/dog-wind.mp4",
      poster: "/reddit-seamless/dog-wind-poster.jpg",
      alt: "A corgi enjoying the wind with its ears blown back",
      kind: "gif",
    },
    votes: 44000,
    comments: 538,
  },
];

const comments: Comment[] = [
  {
    id: "c1",
    author: "Chemiwar",
    age: "1d",
    avatarSrc: `${defaultAvatarBase}/avatar_default_0.png`,
    body: "Mexico. Sounds like an odd choice, but at night when you step outside from inside the Pyramid your eyeballs aren't immediately eviscerated by the razor sharp Florida sun rays of death.",
    score: 219,
  },
  {
    id: "c2",
    author: "Direct-Question2124",
    age: "7h",
    avatarSrc: `${defaultAvatarBase}/avatar_default_5.png`,
    body: "It's Mexico, because that is the best at all times. The atmosphere inside the pyramid is top tier.",
    score: 82,
  },
  {
    id: "c3",
    author: "OwlfWatcher",
    age: "5h",
    avatarSrc: `${defaultAvatarBase}/avatar_default_7.png`,
    body: "Plaza de los Amigos hands down best place in WOW. Tijuana, Volcano, permanent twilight.",
    score: 44,
  },
  {
    id: "c4",
    author: "RocketInLeather",
    age: "4h",
    avatarSrc: `${defaultAvatarBase}/avatar_default_1.png`,
    body: "No pun intended? 😅",
    score: 9,
    depth: 1,
  },
  {
    id: "c5",
    author: "gracefulstatic",
    age: "1d",
    avatarSrc: `${defaultAvatarBase}/avatar_default_6.png`,
    body: "I love them all, so it will probably depend on which day you ask me. With that said, I was really digging the Japan pavilion at night on our most recent trip. Just something about the excitement of being able to peep into the shops, the lights on the pagoda and castle, and just the general ambiance.",
    score: 67,
  },
  {
    id: "c6",
    author: "Chadwick9201",
    age: "20h",
    avatarSrc: `${defaultAvatarBase}/avatar_default_3.png`,
    body: "Tied between Morocco and France. The lighting packages in both are stunning at night.",
    score: 94,
  },
  {
    id: "c7",
    author: "keviniswinn",
    age: "20h",
    avatarSrc: `${defaultAvatarBase}/avatar_default_4.png`,
    body: "I have been going to Epcot for 40 years. We recently became AP holders and have been really exploring Epcot. Morocco was on our list last Friday. I have never really explored that area, and let me tell you, I was blown away.",
    score: 38,
  },
  {
    id: "c8",
    author: "evilGeniuss",
    age: "2h",
    avatarSrc: `${defaultAvatarBase}/avatar_default_2.png`,
    body: "I went in December 2020, much to the dismay of some of my friends and family, but I will never forget that tiny once in a lifetime experience of how empty everything was.",
    score: 113,
  },
  {
    id: "c9",
    author: "zoodles99",
    age: "7h",
    avatarSrc: `${defaultAvatarBase}/avatar_default_5.png`,
    body: "Oh you can still go early and be alone for the first half-hour in any country. Everyone else will be trying to get on a ride first thing.",
    score: 52,
  },
  {
    id: "c10",
    author: "Spanx77",
    age: "25m",
    avatarSrc: `${defaultAvatarBase}/avatar_default_0.png`,
    body: "Yeah but without the international CMS and live entertainment it was a shell of itself. I went in May 2021 and even though it was still extremely light crowds I resolved not to go back until it was back to normal.",
    score: 416,
  },
];

const spring = {
  type: "spring" as const,
  stiffness: 360,
  damping: 34,
  mass: 0.82,
};

const PlaybackRateContext = createContext<PlaybackRate>(1);
const loadedMediaSources = new Set<string>();

function motionDuration(duration: number, playbackRate: PlaybackRate, reduceMotion: boolean) {
  return reduceMotion ? 0 : duration / playbackRate;
}

function motionSpring(playbackRate: PlaybackRate, reduceMotion: boolean) {
  if (reduceMotion) return { duration: 0 };
  const timeScale = 1 / playbackRate;
  return {
    ...spring,
    stiffness: spring.stiffness / (timeScale * timeScale),
    damping: spring.damping / timeScale,
  };
}

function sharedElementTransition(playbackRate: PlaybackRate, reduceMotion: boolean) {
  return {
    type: "tween" as const,
    duration: motionDuration(0.2, playbackRate, reduceMotion),
    ease: [0.16, 1, 0.3, 1] as const,
  };
}

const feedDetailEase = [0.16, 1, 0.3, 1] as const;
const feedDetailScrimOpacity = 0.48;
const viewerOpenTimes = [0, 0.235, 0.47, 0.765, 1];
const viewerOpenGeometry = [0, 0.36, 0.65, 0.92, 1];

function relativeRect(element: Element | null, surface: Element | null): RelativeRect | null {
  if (!element || !surface) return null;
  const elementRect = element.getBoundingClientRect();
  const surfaceRect = surface.getBoundingClientRect();
  const surfaceWidth = surface instanceof HTMLElement ? surface.offsetWidth : surfaceRect.width;
  const surfaceHeight = surface instanceof HTMLElement ? surface.offsetHeight : surfaceRect.height;
  const inverseScaleX = surfaceRect.width > 0 ? surfaceWidth / surfaceRect.width : 1;
  const inverseScaleY = surfaceRect.height > 0 ? surfaceHeight / surfaceRect.height : 1;
  const left = Math.max(0, Math.min(surfaceWidth, (elementRect.left - surfaceRect.left) * inverseScaleX));
  const right = Math.max(left, Math.min(surfaceWidth, (elementRect.right - surfaceRect.left) * inverseScaleX));
  const top = Math.max(47, Math.min(surfaceHeight, (elementRect.top - surfaceRect.top) * inverseScaleY));
  const bottom = Math.max(top, Math.min(surfaceHeight, (elementRect.bottom - surfaceRect.top) * inverseScaleY));

  return {
    top,
    right,
    bottom,
    left,
    width: right - left,
    height: bottom - top,
  };
}

function viewerMediaAspect(post: Post) {
  if (post.id === "kitten" || post.id === "ralph") return 1;
  if (post.id === "summit") return 1.4;
  return 1.5;
}

function viewerTargetRect(post: Post, surface: HTMLElement): RelativeRect {
  const width = surface.offsetWidth;
  const height = width / viewerMediaAspect(post);
  const top = 99 + (surface.offsetHeight - 99 - 43 - height) / 2;
  return {
    top,
    right: width,
    bottom: top + height,
    left: 0,
    width,
    height,
  };
}

function postIdentityRects(
  postElement: Element | null,
  surface: Element | null,
): PostIdentityRects | undefined {
  if (!postElement || !surface) return undefined;
  const avatar = relativeRect(
    postElement.querySelector('[data-transition-identity="avatar"]'),
    surface,
  );
  const community = relativeRect(
    postElement.querySelector('[data-transition-identity="community"]'),
    surface,
  );
  const title = relativeRect(
    postElement.querySelector('[data-transition-identity="title"]'),
    surface,
  );
  return avatar && community && title ? { avatar, community, title } : undefined;
}

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

function usePrototypePlaybackRate() {
  return useContext(PlaybackRateContext);
}

function formatCount(value: number) {
  if (value < 1000) return String(value);
  const decimals = value < 10000 && value % 1000 !== 0 ? 1 : 0;
  return `${(value / 1000).toFixed(decimals)}k`;
}

function StatusBar({ dark }: { dark: boolean }) {
  return (
    <div className={styles.statusBar} data-dark={dark || undefined} aria-hidden="true">
      <strong>12:33</strong>
      <span className={styles.dynamicIsland} />
      <span className={styles.statusIcons}>
        <Image
          className={styles.statusLevels}
          src={withBasePath("/reddit-seamless/status-levels.svg")}
          alt=""
          width={130}
          height={13}
          unoptimized
        />
      </span>
    </div>
  );
}

function CommunityAvatar({
  identityMotion,
  post,
  small = false,
  transitionIdentity = false,
}: {
  identityMotion?: MotionStyle;
  post: Post;
  small?: boolean;
  transitionIdentity?: boolean;
}) {
  return (
    <motion.span
      className={styles.communityAvatar}
      data-small={small || undefined}
      data-transition-identity={transitionIdentity ? "avatar" : undefined}
      style={{
        "--avatar-image": `url("${post.avatarSrc}")`,
        ...identityMotion,
      } as CSSProperties & MotionStyle}
      aria-hidden="true"
    />
  );
}

function PostMedia({
  eager = false,
  paused = false,
  post,
  reduceMotion,
  startTime,
  variant,
}: {
  eager?: boolean;
  paused?: boolean;
  post: Post;
  reduceMotion: boolean;
  startTime?: number;
  variant: "feed" | "detail" | "sticky" | "viewer" | "viewerMini";
}) {
  const playbackRate = usePrototypePlaybackRate();
  const media = post.media;
  const isVideo = media?.kind === "gif" && Boolean(media.videoSrc);
  const source = media ? withBasePath(isVideo ? media.videoSrc ?? media.src : media.src) : "";
  const [loaded, setLoaded] = useState(() => loadedMediaSources.has(source));
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const syncedStartTime = useRef<number>();

  useEffect(() => {
    const video = videoRef.current;
    if (!isVideo || !video) return;
    const syncPlaybackPosition = () => {
      if (
        startTime === undefined
        || syncedStartTime.current === startTime
        || !Number.isFinite(video.duration)
      ) return;
      video.currentTime = video.duration > 0 ? startTime % video.duration : startTime;
      syncedStartTime.current = startTime;
    };

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) syncPlaybackPosition();
    else video.addEventListener("loadedmetadata", syncPlaybackPosition, { once: true });

    video.playbackRate = playbackRate;
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      loadedMediaSources.add(source);
      setLoaded(true);
    }
    if (paused) {
      video.pause();
    } else {
      void video.play().catch(() => undefined);
    }
    return () => video.removeEventListener("loadedmetadata", syncPlaybackPosition);
  }, [isVideo, paused, playbackRate, source, startTime]);

  if (!media) return null;

  return (
    <motion.div
      className={styles.mediaFrame}
      data-loaded={loaded || undefined}
      data-post-id={post.id}
      data-variant={variant}
      transition={sharedElementTransition(playbackRate, reduceMotion)}
    >
      {!loaded && !failed ? <span className={styles.mediaSkeleton} /> : null}
      {failed ? (
        <span className={styles.mediaError}>
          <ImageSquare size={28} />
          <span>Media couldn&apos;t load</span>
        </span>
      ) : isVideo ? (
        <video
          ref={videoRef}
          src={source}
          poster={media.poster ? withBasePath(media.poster) : undefined}
          aria-label={media.alt}
          autoPlay
          loop
          muted
          playsInline
          preload={eager ? "auto" : "metadata"}
          onLoadedData={() => {
            loadedMediaSources.add(source);
            setLoaded(true);
          }}
          onError={() => setFailed(true)}
        />
      ) : (
        <Image
          src={source}
          alt={media.alt}
          fill
          priority={eager}
          sizes="(max-width: 600px) 100vw, 420px"
          unoptimized
          draggable={false}
          onLoad={() => {
            loadedMediaSources.add(source);
            setLoaded(true);
          }}
          onError={() => setFailed(true)}
        />
      )}
    </motion.div>
  );
}

function ActionRow({
  dark = false,
  isUpvoted,
  onComments,
  onShare,
  onVote,
  post,
}: {
  dark?: boolean;
  isUpvoted: boolean;
  onComments: () => void;
  onShare: () => void;
  onVote: () => void;
  post: Post;
}) {
  return (
    <div className={styles.actionRow} data-dark={dark || undefined}>
      <span className={styles.voteCluster} data-active={isUpvoted || undefined}>
        <button type="button" onClick={onVote} aria-label={`Upvote ${post.title}`}>
          <RedditIcon name={isUpvoted ? "upvoteFill" : "upvote"} size={18} />
          <span>{formatCount(post.votes + (isUpvoted ? 1 : 0))}</span>
        </button>
        <button type="button" aria-label={`Downvote ${post.title}`}>
          <RedditIcon name="downvote" size={18} />
        </button>
      </span>
      <button className={styles.commentPill} type="button" onClick={onComments}>
        <RedditIcon name="comment" size={17} />
        <span>{formatCount(post.comments)} Comments</span>
      </button>
      <button className={styles.shareButton} type="button" onClick={onShare} aria-label="Share post">
        <RedditIcon name="share" size={18} />
      </button>
    </div>
  );
}

function FeedPost({
  eager,
  isUpvoted,
  onComments,
  onOpen,
  onOverflow,
  onShare,
  onVote,
  post,
  reduceMotion,
  transitionIdentitySource,
  transitionProgress,
  transitionSource,
}: {
  eager?: boolean;
  isUpvoted: boolean;
  onComments: (origin: FeedPostOrigin) => void;
  onOpen: (origin: FeedPostOrigin) => void;
  onOverflow: () => void;
  onShare: () => void;
  onVote: () => void;
  post: Post;
  reduceMotion: boolean;
  transitionIdentitySource: boolean;
  transitionProgress: MotionValue<number>;
  transitionSource: boolean;
}) {
  const articleRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const transitionSourceOpacity = useTransform(transitionProgress, [0, 0.02], [1, 0]);

  const transitionOrigin = useCallback(
    (): FeedPostOrigin => ({ article: articleRef.current, media: mediaRef.current }),
    [],
  );

  return (
    <motion.article
      ref={articleRef}
      className={styles.feedPost}
      data-post-id={post.id}
      data-transition-identity-source={transitionIdentitySource || undefined}
      data-transition-source={transitionSource || undefined}
      data-transition-surface={post.id}
      style={{ opacity: transitionSource ? transitionSourceOpacity : 1 }}
    >
      <header className={styles.postHeader}>
        <button type="button" className={styles.communityButton} onClick={() => onOpen(transitionOrigin())}>
          <CommunityAvatar post={post} transitionIdentity />
          <span data-transition-identity="community">
            <strong>{post.community}</strong>
            <small>{post.time}</small>
          </span>
        </button>
        <button className={styles.iconButton} type="button" onClick={onOverflow} aria-label="Post options">
          <RedditIcon name="overflow" size={20} />
        </button>
      </header>
      <button className={styles.postTitleButton} type="button" onClick={() => onOpen(transitionOrigin())}>
        <span data-transition-identity="title">{post.title}</span>
      </button>
      {post.media ? (
        <button className={styles.mediaButton} type="button" onClick={() => onOpen(transitionOrigin())} aria-label={`Open ${post.title}`}>
          <motion.div
            ref={mediaRef}
            className={styles.sharedMediaTransition}
            data-transition-media={post.id}
            data-variant="feed"
          >
            <PostMedia post={post} variant="feed" eager={eager} reduceMotion={reduceMotion} />
          </motion.div>
          {post.media.kind === "gif" ? (
            <span className={styles.muteBadge} aria-hidden="true">
              <RedditIcon name="volumeOffFill" size={13} />
            </span>
          ) : null}
        </button>
      ) : null}
      <ActionRow
        post={post}
        isUpvoted={isUpvoted}
        onVote={onVote}
        onComments={() => onComments(transitionOrigin())}
        onShare={onShare}
      />
    </motion.article>
  );
}

function FeedHeader({
  onAvatar,
  onFeedMenu,
  onMenu,
  onSearch,
}: {
  onAvatar: () => void;
  onFeedMenu: () => void;
  onMenu: () => void;
  onSearch: () => void;
}) {
  return (
    <header className={styles.feedHeader}>
      <button className={styles.iconButtonLarge} type="button" onClick={onMenu} aria-label="Open navigation">
        <IOSIcon name="menu" size={22} />
      </button>
      <button className={styles.feedSelector} type="button" onClick={onFeedMenu} aria-label="Choose feed">
        <strong>Home</strong>
        <IOSIcon name="chevronDown" size={14} />
      </button>
      <span className={styles.headerSpacer} />
      <button className={styles.iconButtonLarge} type="button" onClick={onSearch} aria-label="Search Reddit">
        <IOSIcon name="search" size={23} />
      </button>
      <button className={styles.profileButton} type="button" onClick={onAvatar} aria-label="Open profile" />
    </header>
  );
}

function BottomNavigation({ onUnavailable }: { onUnavailable: (label: string) => void }) {
  return (
    <nav className={styles.bottomNav} aria-label="Primary Reddit navigation">
      <button type="button" data-active="true">
        <RedditIcon name="homeFill" size={24} />
        <span>Home</span>
      </button>
      <button type="button" onClick={() => onUnavailable("Communities")}>
        <RedditIcon name="communities" size={24} />
        <span>Communities</span>
      </button>
      <button type="button" onClick={() => onUnavailable("Create")}>
        <RedditIcon name="addSquare" size={27} />
        <span>Create</span>
      </button>
      <button type="button" onClick={() => onUnavailable("Chat")}>
        <RedditIcon name="chat" size={24} />
        <span>Chat</span>
      </button>
      <button type="button" onClick={() => onUnavailable("Inbox")}>
        <RedditIcon name="notifications" size={24} />
        <span>Inbox</span>
      </button>
    </nav>
  );
}

function FeedScreen({
  active,
  feedScrollerRef,
  initialScroll,
  onAvatar,
  onComments,
  onFeedMenu,
  onMenu,
  onOpen,
  onOverflow,
  onSearch,
  onShare,
  onUnavailable,
  onVote,
  reduceMotion,
  transition,
  transitionProgress,
  upvoted,
}: {
  active: boolean;
  feedScrollerRef: RefObject<HTMLDivElement | null>;
  initialScroll: number;
  onAvatar: () => void;
  onComments: (id: string, origin: FeedPostOrigin) => void;
  onFeedMenu: () => void;
  onMenu: () => void;
  onOpen: (id: string, origin: FeedPostOrigin) => void;
  onOverflow: () => void;
  onSearch: () => void;
  onShare: (post: Post) => void;
  onUnavailable: (label: string) => void;
  onVote: (id: string) => void;
  reduceMotion: boolean;
  transition: FeedDetailTransition | null;
  transitionProgress: MotionValue<number>;
  upvoted: Set<string>;
}) {
  const playbackRate = usePrototypePlaybackRate();
  const restoredInitialScroll = useRef(false);
  const feedScale = useTransform(transitionProgress, [0, 1], [1, 0.96]);

  useEffect(() => {
    if (restoredInitialScroll.current) return;
    const frame = requestAnimationFrame(() => {
      if (feedScrollerRef.current) {
        feedScrollerRef.current.scrollTop = initialScroll;
        restoredInitialScroll.current = true;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [feedScrollerRef, initialScroll]);

  return (
    <motion.section
      className={styles.appScreen}
      data-screen="feed"
      data-inactive={!active || Boolean(transition) || undefined}
      initial={false}
      animate={{ opacity: 1 }}
      style={{ scale: feedScale }}
      transition={{ duration: motionDuration(0.16, playbackRate, reduceMotion) }}
      aria-label="Reddit home feed"
      aria-hidden={!active || Boolean(transition)}
      inert={!active || Boolean(transition)}
    >
      <FeedHeader onMenu={onMenu} onFeedMenu={onFeedMenu} onSearch={onSearch} onAvatar={onAvatar} />
      <motion.div className={styles.feedScroller} ref={feedScrollerRef} layoutScroll>
        {posts.map((post) => (
          <FeedPost
            key={post.id}
            post={post}
            eager={post.id === "kitten"}
            transitionProgress={transitionProgress}
            transitionIdentitySource={Boolean(transition && transition.postId === post.id)}
            transitionSource={transition?.direction === "opening" && transition.postId === post.id}
            reduceMotion={reduceMotion}
            isUpvoted={upvoted.has(post.id)}
            onOpen={(origin) => onOpen(post.id, origin)}
            onComments={(origin) => onComments(post.id, origin)}
            onOverflow={onOverflow}
            onShare={() => onShare(post)}
            onVote={() => onVote(post.id)}
          />
        ))}
      </motion.div>
      <BottomNavigation onUnavailable={onUnavailable} />
    </motion.section>
  );
}

function DetailHeader({ onBack, onNotify }: { onBack: () => void; onNotify: (message: string) => void }) {
  return (
    <header className={styles.detailHeader}>
      <button className={styles.iconButtonLarge} type="button" onClick={onBack} aria-label="Close post">
        <IOSIcon name="close" size={23} />
      </button>
      <span className={styles.headerSpacer} />
      <button className={styles.iconButtonLarge} type="button" onClick={() => onNotify("Search opened")} aria-label="Search comments">
        <IOSIcon name="search" size={23} />
      </button>
      <button className={styles.iconButtonLarge} type="button" onClick={() => onNotify("Comment sorting set to Best")} aria-label="Sort comments">
        <IOSIcon name="sliders" size={22} />
      </button>
      <button className={styles.iconButtonLarge} type="button" onClick={() => onNotify("Post options opened")} aria-label="Post options">
        <IOSIcon name="ellipsis" size={21} />
      </button>
    </header>
  );
}

function CommentItem({ comment, onNotify }: { comment: Comment; onNotify: (message: string) => void }) {
  return (
    <article className={styles.comment} data-depth={comment.depth ?? 0}>
      <header>
        <span
          className={styles.commentAvatar}
          style={{ "--avatar-image": `url("${comment.avatarSrc}")` } as CSSProperties}
          aria-hidden="true"
        />
        <strong>{comment.author}</strong>
        <small>{comment.age}</small>
      </header>
      <p>{comment.body}</p>
      <footer>
        <button type="button" onClick={() => onNotify("More comment actions")} aria-label="More comment actions">
          <RedditIcon name="overflow" size={17} />
        </button>
        <button type="button" onClick={() => onNotify(`Replying to ${comment.author}`)} aria-label={`Reply to ${comment.author}`}>
          <RedditIcon name="reply" size={16} />
        </button>
        <button type="button" onClick={() => onNotify("Comment upvoted")} aria-label="Upvote comment">
          <RedditIcon name="upvote" size={16} />
        </button>
        <span>{comment.score}</span>
        <button type="button" onClick={() => onNotify("Comment downvoted")} aria-label="Downvote comment">
          <RedditIcon name="downvote" size={16} />
        </button>
      </footer>
    </article>
  );
}

function CommentComposer({ onSubmit }: { onSubmit: (message: string) => void }) {
  const [draft, setDraft] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) return;
    onSubmit("Comment added to the prototype");
    setDraft("");
  }

  return (
    <form className={styles.commentComposer} onSubmit={submit}>
      <label className="sr-only" htmlFor="reddit-prototype-comment">
        Add a comment
      </label>
      <input
        id="reddit-prototype-comment"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Add a comment..."
      />
      <button type="button" aria-label="Add an image" onClick={() => onSubmit("Image picker opened")}>
        <ImageSquare size={21} />
      </button>
      <button type="submit" data-visible={Boolean(draft.trim()) || undefined}>
        Post
      </button>
    </form>
  );
}

function CommentsList({ onNotify }: { onNotify: (message: string) => void }) {
  return (
    <div className={styles.commentsList}>
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} onNotify={onNotify} />
      ))}
    </div>
  );
}

function DetailScreen({
  commentsFirst,
  hideViewerReturnTarget = false,
  identityMotion,
  isUpvoted,
  mediaStartTime,
  onBack,
  onNotify,
  onOpenViewer,
  onShare,
  onVote,
  post,
  reduceMotion,
  suppressViewerLayout = false,
  transitionPreview = false,
}: {
  commentsFirst: boolean;
  hideViewerReturnTarget?: boolean;
  identityMotion?: DetailIdentityMotion;
  isUpvoted: boolean;
  mediaStartTime?: number;
  onBack: () => void;
  onNotify: (message: string) => void;
  onOpenViewer: (entryMode: ViewerEntryMode) => void;
  onShare: () => void;
  onVote: () => void;
  post: Post;
  reduceMotion: boolean;
  suppressViewerLayout?: boolean;
  transitionPreview?: boolean;
}) {
  const playbackRate = usePrototypePlaybackRate();
  const [compactSummary, setCompactSummary] = useState(commentsFirst);
  const commentsMarkerRef = useRef<HTMLDivElement>(null);
  const detailEndRef = useRef<HTMLDivElement>(null);
  const detailScrollerRef = useRef<HTMLDivElement>(null);

  const scrollToComments = useCallback(() => {
    setCompactSummary(true);
    commentsMarkerRef.current?.scrollIntoView({
      block: "start",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [reduceMotion]);

  useEffect(() => {
    if (!commentsFirst || transitionPreview) return;
    const timer = window.setTimeout(
      scrollToComments,
      motionDuration(0.22, playbackRate, reduceMotion) * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [commentsFirst, playbackRate, reduceMotion, scrollToComments, transitionPreview]);

  useEffect(() => {
    if (transitionPreview) return;
    const target = detailEndRef.current;
    const root = detailScrollerRef.current;
    if (!target || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => setCompactSummary(!entry.isIntersecting),
      { root, threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [transitionPreview]);

  return (
    <motion.section
      className={styles.appScreen}
      data-screen="detail"
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0 } }}
      data-transition-preview={transitionPreview || undefined}
      data-viewer-return-hidden={hideViewerReturnTarget || undefined}
      aria-label={`${post.title} post and comments`}
    >
      <div
        className={styles.detailExpansionSurface}
        data-transition-surface={post.id}
        aria-hidden="true"
      />
      <DetailHeader onBack={onBack} onNotify={onNotify} />
      <AnimatePresence>
        {compactSummary && post.media ? (
          <motion.button
            className={styles.stickySummary}
            type="button"
            onClick={() => onOpenViewer("sticky")}
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: motionDuration(0.14, playbackRate, reduceMotion) }}
            aria-label="Open post media"
          >
            <strong>{post.title}</strong>
            {post.media.kind === "gif" ? <RedditIcon name="pauseFill" size={17} /> : null}
            <PostMedia
              post={post}
              variant="sticky"
              eager
              reduceMotion={reduceMotion}
            />
          </motion.button>
        ) : null}
      </AnimatePresence>
      <motion.div className={styles.detailScroller} ref={detailScrollerRef} layoutScroll>
        <motion.article
          className={styles.detailPost}
          data-detail-post={post.id}
        >
          <header className={styles.detailCommunity}>
            <CommunityAvatar
              identityMotion={identityMotion?.avatar}
              post={post}
              transitionIdentity
            />
            <span className={styles.detailCommunityCopy}>
              <motion.span
                className={styles.detailCommunityPrimary}
                data-transition-identity="community"
                style={identityMotion?.community}
              >
                <strong>{post.community}</strong>
                <small>{post.time}</small>
              </motion.span>
              <motion.em style={identityMotion?.author}>{post.author}</motion.em>
            </span>
          </header>
          <h1>
            <motion.span
              data-transition-identity="title"
              style={identityMotion?.title}
            >
              {post.title}
            </motion.span>
          </h1>
          {post.media ? (
            <button
              className={styles.detailMediaButton}
              type="button"
              onClick={() => onOpenViewer("media")}
              aria-label="Open immersive media viewer"
            >
              <motion.div
                className={styles.sharedMediaTransition}
                data-transition-preview-media={transitionPreview || undefined}
                data-detail-media={post.id}
                data-variant="detail"
              >
                <motion.div
                  className={styles.sharedMediaTransition}
                  data-variant="detail"
                  data-viewer-return-hidden={hideViewerReturnTarget || undefined}
                  data-viewer-return-target={suppressViewerLayout || undefined}
                >
                  <PostMedia
                    post={post}
                    variant="detail"
                    eager
                    reduceMotion={reduceMotion}
                    startTime={mediaStartTime}
                  />
                </motion.div>
              </motion.div>
              {post.media.kind === "gif" ? (
                <span className={styles.muteBadge} aria-hidden="true">
                  <RedditIcon name="volumeOffFill" size={13} />
                </span>
              ) : null}
            </button>
          ) : null}
          <ActionRow
            post={post}
            isUpvoted={isUpvoted}
            onVote={onVote}
            onComments={scrollToComments}
            onShare={onShare}
          />
          <div className={styles.detailEndSentinel} ref={detailEndRef} aria-hidden="true" />
        </motion.article>
        <div className={styles.commentsAnchor} ref={commentsMarkerRef} />
        <CommentsList onNotify={onNotify} />
      </motion.div>
      <CommentComposer onSubmit={onNotify} />
    </motion.section>
  );
}

function FeedDetailTransitionLayer({
  isUpvoted,
  onComplete,
  post,
  reduceMotion,
  transition,
  transitionProgress,
}: {
  isUpvoted: boolean;
  onComplete: () => void;
  post: Post;
  reduceMotion: boolean;
  transition: FeedDetailTransition;
  transitionProgress: MotionValue<number>;
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [canvasOffset, setCanvasOffset] = useState<number | null>(
    transition.canvasOffset ?? null,
  );
  const [targetIdentity, setTargetIdentity] = useState<PostIdentityRects | undefined>(
    transition.targetIdentity,
  );
  const [measurementReady, setMeasurementReady] = useState(
    transition.canvasOffset !== undefined
      && (!transition.sourceIdentity || Boolean(transition.targetIdentity)),
  );
  const mediaStartTime = transition.mediaTime;

  useLayoutEffect(() => {
    if (measurementReady) return;
    const measureNode = measureRef.current;
    if (!measureNode) return;
    const previewMedia = measureNode.querySelector<HTMLElement>("[data-transition-preview-media]");
    const previewPost = measureNode.querySelector<HTMLElement>(`[data-detail-post="${post.id}"]`);
    const measureBounds = measureNode.getBoundingClientRect();
    const inverseScaleY = measureBounds.height > 0
      ? measureNode.offsetHeight / measureBounds.height
      : 1;
    const targetMediaTop = previewMedia
      ? (previewMedia.getBoundingClientRect().top - measureBounds.top) * inverseScaleY
      : 99;
    const nextOffset = transition.sourceMedia
      ? transition.sourceMedia.top - targetMediaTop
      : transition.sourceArticle.top - 99;
    setCanvasOffset(nextOffset);
    setTargetIdentity(postIdentityRects(previewPost, measureNode));
    setMeasurementReady(true);
  }, [measurementReady, post.id, transition.sourceArticle.top, transition.sourceMedia]);

  if (!measurementReady || canvasOffset === null) {
    return (
      <div className={styles.feedDetailTransitionMeasure} ref={measureRef} aria-hidden="true" inert>
        <DetailScreen
          post={post}
          commentsFirst={false}
          reduceMotion={reduceMotion}
          transitionPreview
          mediaStartTime={mediaStartTime}
          isUpvoted={isUpvoted}
          onBack={() => undefined}
          onNotify={() => undefined}
          onOpenViewer={() => undefined}
          onVote={() => undefined}
          onShare={() => undefined}
        />
      </div>
    );
  }

  return (
    <FeedDetailTransitionAnimation
      canvasOffset={canvasOffset}
      isUpvoted={isUpvoted}
      mediaStartTime={mediaStartTime}
      onComplete={onComplete}
      post={post}
      reduceMotion={reduceMotion}
      targetIdentity={targetIdentity}
      transition={transition}
      transitionProgress={transitionProgress}
    />
  );
}

function useIdentityNodeMotion(
  progress: MotionValue<number>,
  source: RelativeRect,
  target: RelativeRect,
  canvasOffset: number,
): MotionStyle {
  const x = useTransform(
    progress,
    (value) => lerp(source.left - target.left, 0, value),
  );
  const y = useTransform(
    progress,
    (value) => lerp(source.top - target.top - canvasOffset, 0, value),
  );
  const scaleX = useTransform(
    progress,
    (value) => lerp(source.width / Math.max(target.width, 0.01), 1, value),
  );
  const scaleY = useTransform(
    progress,
    (value) => lerp(source.height / Math.max(target.height, 0.01), 1, value),
  );
  return { x, y, scaleX, scaleY, transformOrigin: "top left" };
}

function MorphingDetailTransitionPreview({
  canvasOffset,
  isUpvoted,
  mediaStartTime,
  post,
  reduceMotion,
  sourceIdentity,
  targetIdentity,
  transitionProgress,
}: {
  canvasOffset: number;
  isUpvoted: boolean;
  mediaStartTime?: number;
  post: Post;
  reduceMotion: boolean;
  sourceIdentity: PostIdentityRects;
  targetIdentity: PostIdentityRects;
  transitionProgress: MotionValue<number>;
}) {
  const avatar = useIdentityNodeMotion(
    transitionProgress,
    sourceIdentity.avatar,
    targetIdentity.avatar,
    canvasOffset,
  );
  const community = useIdentityNodeMotion(
    transitionProgress,
    sourceIdentity.community,
    targetIdentity.community,
    canvasOffset,
  );
  const title = useIdentityNodeMotion(
    transitionProgress,
    sourceIdentity.title,
    targetIdentity.title,
    canvasOffset,
  );
  const authorOpacity = useTransform(
    transitionProgress,
    [0, 0.46, 0.78, 1],
    [0, 0, 0.86, 1],
  );
  const authorY = useTransform(
    transitionProgress,
    [0, 0.46, 1],
    [3, 3, 0],
  );

  return (
    <DetailScreen
      post={post}
      commentsFirst={false}
      identityMotion={{
        author: { opacity: authorOpacity, y: authorY },
        avatar,
        community,
        title,
      }}
      reduceMotion={reduceMotion}
      transitionPreview
      mediaStartTime={mediaStartTime}
      isUpvoted={isUpvoted}
      onBack={() => undefined}
      onNotify={() => undefined}
      onOpenViewer={() => undefined}
      onVote={() => undefined}
      onShare={() => undefined}
    />
  );
}

function FeedDetailTransitionAnimation({
  canvasOffset,
  isUpvoted,
  mediaStartTime,
  onComplete,
  post,
  reduceMotion,
  targetIdentity,
  transition,
  transitionProgress,
}: {
  canvasOffset: number;
  isUpvoted: boolean;
  mediaStartTime?: number;
  onComplete: () => void;
  post: Post;
  reduceMotion: boolean;
  targetIdentity?: PostIdentityRects;
  transition: FeedDetailTransition;
  transitionProgress: MotionValue<number>;
}) {
  const completed = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const opening = transition.direction === "opening";
  const duration = motionDuration(opening ? 0.17 : 0.15, transition.playbackRate, reduceMotion);
  const clipPath = useTransform(transitionProgress, (progress) => {
    const top = lerp(transition.sourceArticle.top, 47, progress);
    const bottom = lerp(transition.sourceArticle.bottom, transition.surfaceHeight, progress);
    const left = lerp(transition.sourceArticle.left, 0, progress);
    const rightEdge = lerp(transition.sourceArticle.right, transition.surfaceWidth, progress);
    const right = transition.surfaceWidth - rightEdge;
    const bottomInset = transition.surfaceHeight - bottom;
    return `inset(${top}px ${right}px ${bottomInset}px ${left}px round 0px)`;
  });
  const canvasY = useTransform(
    transitionProgress,
    (progress) => lerp(canvasOffset, 0, progress),
  );
  const scrimOpacity = useTransform(
    transitionProgress,
    (progress) => feedDetailScrimOpacity * progress,
  );

  useLayoutEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const complete = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    onCompleteRef.current();
  }, []);

  useLayoutEffect(() => {
    const start = opening ? 0 : 1;
    const target = opening ? 1 : 0;
    transitionProgress.set(start);

    if (duration === 0) {
      transitionProgress.set(target);
      const frame = requestAnimationFrame(complete);
      return () => cancelAnimationFrame(frame);
    }

    const controls = animate(transitionProgress, target, {
      duration,
      ease: feedDetailEase,
      onComplete: complete,
    });
    return () => controls.stop();
  }, [complete, duration, opening, transitionProgress]);

  return (
    <div
      className={styles.feedDetailTransitionLayer}
      data-feed-detail-transition={transition.direction}
      aria-hidden="true"
      inert
    >
      <motion.div
        className={styles.feedDetailTransitionScrim}
        data-transition-scrim
        style={{ opacity: scrimOpacity }}
      />
      <motion.div
        className={styles.feedDetailTransitionMask}
        data-transition-mask
        style={{ clipPath }}
      >
        <motion.div
          className={styles.feedDetailTransitionCanvas}
          data-transition-canvas
          style={{ y: canvasY }}
        >
          {transition.sourceIdentity && targetIdentity ? (
            <MorphingDetailTransitionPreview
              canvasOffset={canvasOffset}
              isUpvoted={isUpvoted}
              mediaStartTime={mediaStartTime}
              post={post}
              reduceMotion={reduceMotion}
              sourceIdentity={transition.sourceIdentity}
              targetIdentity={targetIdentity}
              transitionProgress={transitionProgress}
            />
          ) : (
            <DetailScreen
              post={post}
              commentsFirst={false}
              reduceMotion={reduceMotion}
              transitionPreview
              mediaStartTime={mediaStartTime}
              isUpvoted={isUpvoted}
              onBack={() => undefined}
              onNotify={() => undefined}
              onOpenViewer={() => undefined}
              onVote={() => undefined}
              onShare={() => undefined}
            />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

const viewerVariants = {
  enter: (direction: number) =>
    direction === 0
      ? { opacity: 1, x: "0%" }
      : { opacity: 0.35, x: `${direction * 100}%` },
  center: { opacity: 1, x: "0%" },
  exit: (direction: number) =>
    direction === 0
      ? { opacity: 1, x: "0%" }
      : { opacity: 0.2, x: `${direction * -100}%` },
};

function ViewerCommentsSheet({
  onClose,
  onNotify,
  post,
  reduceMotion,
}: {
  onClose: () => void;
  onNotify: (message: string) => void;
  post: Post;
  reduceMotion: boolean;
}) {
  const playbackRate = usePrototypePlaybackRate();

  return (
    <motion.section
      className={styles.viewerCommentsSheet}
      initial={reduceMotion ? false : { y: "100%" }}
      animate={{ y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { y: "100%" }}
      transition={motionSpring(playbackRate, reduceMotion)}
      aria-label="Post comments"
    >
      <button className={styles.sheetGrabber} type="button" onClick={onClose} aria-label="Close comments">
        <span />
      </button>
      <header className={styles.sheetPostSummary}>
        <CommunityAvatar post={post} />
        <span>
          <strong>{post.author}</strong>
          <small>{post.community}</small>
        </span>
        <p>{post.title}</p>
      </header>
      <div className={styles.viewerCommentsScroller}>
        <CommentsList onNotify={onNotify} />
      </div>
      <CommentComposer onSubmit={onNotify} />
    </motion.section>
  );
}

function ViewerOpenTransitionAnimation({
  onComplete,
  post,
  progress,
  reduceMotion,
  transition,
}: {
  onComplete: () => void;
  post: Post;
  progress: MotionValue<number>;
  reduceMotion: boolean;
  transition: ViewerOpenTransition & { sourceMedia: RelativeRect; targetMedia: RelativeRect };
}) {
  const completed = useRef(false);
  const duration = motionDuration(0.18, transition.playbackRate, reduceMotion);
  const source = transition.sourceMedia;
  const target = transition.targetMedia;
  const left = useTransform(progress, (value) => lerp(source.left, target.left, value));
  const top = useTransform(progress, (value) => lerp(source.top, target.top, value));
  const width = useTransform(progress, (value) => lerp(source.width, target.width, value));
  const height = useTransform(progress, (value) => lerp(source.height, target.height, value));
  const borderRadius = useTransform(progress, (value) => lerp(12, 0, value));

  const complete = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    onComplete();
  }, [onComplete]);

  useLayoutEffect(() => {
    progress.set(0);
    if (duration === 0) {
      progress.set(1);
      const frame = window.requestAnimationFrame(complete);
      return () => window.cancelAnimationFrame(frame);
    }
    const controls = animate(progress, viewerOpenGeometry, {
      duration,
      ease: "linear",
      times: viewerOpenTimes,
      onComplete: complete,
    });
    return () => controls.stop();
  }, [complete, duration, progress]);

  return (
    <motion.div
      className={styles.viewerCloseTransitionMedia}
      data-viewer-open-media
      style={{ borderRadius, height, left, top, width }}
    >
      <div className={styles.viewerCloseMediaLayer} data-layer="origin">
        <PostMedia
          post={post}
          variant="viewer"
          eager
          reduceMotion={reduceMotion}
          startTime={transition.sourceMediaTime}
        />
      </div>
    </motion.div>
  );
}

function ViewerOpenTransitionLayer({
  onComplete,
  post,
  progress,
  reduceMotion,
  transition,
}: {
  onComplete: () => void;
  post: Post;
  progress: MotionValue<number>;
  reduceMotion: boolean;
  transition: ViewerOpenTransition;
}) {
  const fallbackCompleted = useRef(false);
  const ready = Boolean(transition.sourceMedia && transition.targetMedia);

  useLayoutEffect(() => {
    if (!transition.targetMedia || transition.sourceMedia || fallbackCompleted.current) return;
    fallbackCompleted.current = true;
    progress.set(1);
    const frame = window.requestAnimationFrame(onComplete);
    return () => window.cancelAnimationFrame(frame);
  }, [onComplete, progress, transition.sourceMedia, transition.targetMedia]);

  return (
    <div
      className={styles.viewerCloseTransitionLayer}
      data-viewer-open-transition
      aria-hidden="true"
      inert
    >
      {ready ? (
        <ViewerOpenTransitionAnimation
          onComplete={onComplete}
          post={post}
          progress={progress}
          reduceMotion={reduceMotion}
          transition={transition as ViewerOpenTransition & {
            sourceMedia: RelativeRect;
            targetMedia: RelativeRect;
          }}
        />
      ) : transition.sourceMedia ? (
        <div
          className={styles.viewerCloseTransitionMedia}
          data-viewer-open-media
          style={{
            borderRadius: 12,
            height: transition.sourceMedia.height,
            left: transition.sourceMedia.left,
            top: transition.sourceMedia.top,
            width: transition.sourceMedia.width,
          }}
        >
          <div className={styles.viewerCloseMediaLayer} data-layer="origin">
            <PostMedia
              post={post}
              variant="viewer"
              eager
              reduceMotion={reduceMotion}
              startTime={transition.sourceMediaTime}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ViewerCloseTransitionLayer({
  currentPost,
  onComplete,
  originPost,
  reduceMotion,
  transition,
}: {
  currentPost: Post;
  onComplete: () => void;
  originPost: Post;
  reduceMotion: boolean;
  transition: ViewerCloseTransition;
}) {
  const completed = useRef(false);
  const duration = motionDuration(0.18, transition.playbackRate, reduceMotion);
  const hasSharedGeometry = Boolean(transition.sourceMedia && transition.targetMedia);
  const returnsToDifferentPost = currentPost.id !== originPost.id;

  const complete = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    onComplete();
  }, [onComplete]);

  if (!hasSharedGeometry || !transition.sourceMedia || !transition.targetMedia) {
    return (
      <div className={styles.viewerCloseTransitionLayer} aria-hidden="true" inert>
        <motion.span
          className={styles.viewerCloseTransitionTimer}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration, ease: "linear" }}
          onAnimationComplete={complete}
        />
      </div>
    );
  }

  const source = transition.sourceMedia;
  const target = transition.targetMedia;
  const targetRadius = transition.entryMode === "sticky" ? 0 : 12;
  const geometryTimes = [0, 0.33, 0.67, 1];
  const geometryProgress = [0, 0.36, 0.72, 1];
  const geometryFrames = (from: number, to: number) =>
    geometryProgress.map((progress) => lerp(from, to, progress));
  const originStartTime = returnsToDifferentPost
    ? transition.targetMediaTime
    : transition.sourceMediaTime;

  return (
    <div className={styles.viewerCloseTransitionLayer} aria-hidden="true" inert>
      <motion.div
        className={styles.viewerCloseTransitionMedia}
        initial={{
          borderRadius: 0,
          height: source.height,
          left: source.left,
          top: source.top,
          width: source.width,
        }}
        animate={{
          borderRadius: geometryFrames(0, targetRadius),
          height: geometryFrames(source.height, target.height),
          left: geometryFrames(source.left, target.left),
          top: geometryFrames(source.top, target.top),
          width: geometryFrames(source.width, target.width),
        }}
        transition={{ duration, ease: "linear", times: geometryTimes }}
        onAnimationComplete={complete}
      >
        <motion.div
          className={styles.viewerCloseMediaLayer}
          data-layer="origin"
          initial={{ opacity: returnsToDifferentPost ? 0 : 1 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: motionDuration(returnsToDifferentPost ? 0.1 : 0, transition.playbackRate, reduceMotion),
            ease: "easeOut",
          }}
        >
          <PostMedia
            post={originPost}
            variant="viewer"
            eager
            reduceMotion={reduceMotion}
            startTime={originStartTime}
          />
        </motion.div>
        {returnsToDifferentPost ? (
          <motion.div
            className={styles.viewerCloseMediaLayer}
            data-layer="source"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{
              duration: motionDuration(0.1, transition.playbackRate, reduceMotion),
              ease: "easeOut",
            }}
          >
            <PostMedia
              post={currentPost}
              variant="viewer"
              eager
              reduceMotion={reduceMotion}
              startTime={transition.sourceMediaTime}
            />
          </motion.div>
        ) : null}
      </motion.div>
    </div>
  );
}

function ViewerScreen({
  closing,
  commentsOpen,
  currentIndex,
  direction,
  entryMode,
  isUpvoted,
  mediaStartTime,
  mediaPosts,
  onClose,
  onComments,
  onNavigate,
  onNotify,
  opening,
  openingProgress,
  onShare,
  onVote,
  reduceMotion,
}: {
  closing: boolean;
  commentsOpen: boolean;
  currentIndex: number;
  direction: number;
  entryMode: ViewerEntryMode;
  isUpvoted: boolean;
  mediaStartTime?: number;
  mediaPosts: Post[];
  onClose: () => void;
  onComments: () => void;
  onNavigate: (delta: number) => void;
  onNotify: (message: string) => void;
  opening: boolean;
  openingProgress: MotionValue<number>;
  onShare: () => void;
  onVote: () => void;
  reduceMotion: boolean;
}) {
  const playbackRate = usePrototypePlaybackRate();
  const post = mediaPosts[currentIndex];
  const directMediaEntry = entryMode === "media";
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const openBackdropOpacity = useTransform(
    openingProgress,
    viewerOpenGeometry,
    [0, 0.18, 0.52, 0.9, 1],
  );
  const openHeaderOpacity = useTransform(
    openingProgress,
    viewerOpenGeometry,
    [0, 0, 0.05, 0.75, 1],
  );
  const openMetaOpacity = useTransform(
    openingProgress,
    viewerOpenGeometry,
    [0, 0, 0, 0.65, 1],
  );
  const openMetaY = useTransform(
    openingProgress,
    viewerOpenGeometry,
    [8, 8, 8, 3, 0],
  );

  return (
    <motion.section
      className={styles.appScreen}
      data-screen="viewer"
      data-entry={entryMode}
      data-opening={opening || undefined}
      data-closing={closing || undefined}
      initial={reduceMotion || directMediaEntry ? false : { x: "100%" }}
      animate={{ x: 0 }}
      transition={{
        duration: motionDuration(0.18, playbackRate, reduceMotion),
        ease: [0.22, 0.8, 0.24, 1],
      }}
      aria-label="Immersive media viewer"
      aria-hidden={closing || opening || undefined}
      inert={closing || opening}
    >
      <motion.div
        className={styles.viewerBackdrop}
        initial={false}
        style={{ opacity: opening ? openBackdropOpacity : 1 }}
        animate={opening ? undefined : { opacity: closing ? 0 : 1 }}
        transition={{ duration: motionDuration(0.18, playbackRate, reduceMotion) }}
        aria-hidden="true"
      />
      <motion.header
        className={styles.viewerHeader}
        data-hidden={commentsOpen || closing || opening || undefined}
        initial={false}
        style={{ opacity: opening ? openHeaderOpacity : 1 }}
        animate={opening ? undefined : { opacity: commentsOpen || closing ? 0 : 1 }}
        transition={{ duration: motionDuration(0.12, playbackRate, reduceMotion) }}
      >
        <button type="button" onClick={onClose} aria-label="Close media viewer">
          <IOSIcon name="close" size={24} />
        </button>
        <span className={styles.viewerCommunity}>
          <CommunityAvatar post={post} small />
          <strong>{post.community}</strong>
        </span>
        <button type="button" onClick={() => onNotify("Post options opened")} aria-label="Post options">
          <IOSIcon name="ellipsis" size={21} />
        </button>
      </motion.header>

      <motion.div
        className={styles.viewerMediaZone}
        data-comments={commentsOpen || undefined}
        layout={!closing}
        animate={{ opacity: closing ? 0 : 1 }}
        transition={
          closing
            ? { duration: motionDuration(0.16, playbackRate, reduceMotion), ease: "easeOut" }
            : motionSpring(playbackRate, reduceMotion)
        }
        style={
          {
            "--viewer-backdrop": `url("${withBasePath(post.media?.poster ?? post.media?.src ?? "")}")`,
          } as CSSProperties
        }
        onClick={commentsOpen ? onComments : undefined}
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={post.id}
            className={styles.viewerSlide}
            custom={direction}
            variants={viewerVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={motionSpring(playbackRate, reduceMotion)}
            drag={closing || commentsOpen || reduceMotion ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.22}
            onDragEnd={(_, info) => {
              if (info.offset.x < -58 || info.velocity.x < -520) onNavigate(1);
              if (info.offset.x > 58 || info.velocity.x > 520) onNavigate(-1);
            }}
          >
            <motion.div
              className={styles.sharedMediaTransition}
              data-viewer-media={post.id}
              data-variant={commentsOpen ? "viewerMini" : "viewer"}
            >
              <PostMedia
                post={post}
                variant={commentsOpen ? "viewerMini" : "viewer"}
                eager
                paused={paused}
                reduceMotion={reduceMotion}
                startTime={direction === 0 ? mediaStartTime : undefined}
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <motion.div
        className={styles.viewerMeta}
        initial={false}
        style={{
          opacity: opening ? openMetaOpacity : 1,
          y: opening ? openMetaY : 0,
        }}
        animate={
          opening
            ? undefined
            : closing
            ? { opacity: 0, y: 8 }
            : commentsOpen
              ? { opacity: 0, y: 32 }
              : { opacity: 1, y: 0 }
        }
        transition={{ duration: motionDuration(closing ? 0.12 : 0.18, playbackRate, reduceMotion) }}
        aria-hidden={commentsOpen || closing || undefined}
      >
        <div className={styles.viewerAuthor}>
          <CommunityAvatar post={post} />
          <strong>{post.author}</strong>
        </div>
        <h1>{post.title}</h1>
        {post.media?.kind === "gif" ? (
          <div className={styles.playbackRow}>
            <button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? "Play GIF" : "Pause GIF"}>
              <RedditIcon name={paused ? "playFill" : "pauseFill"} size={17} />
            </button>
            <span className={styles.progressTrack}>
              <span data-paused={paused || undefined} />
            </span>
            <button type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? "Unmute GIF" : "Mute GIF"}>
              {muted ? <RedditIcon name="volumeOffFill" size={18} /> : <SpeakerHigh size={18} weight="fill" />}
            </button>
          </div>
        ) : null}
        <ActionRow
          dark
          post={post}
          isUpvoted={isUpvoted}
          onVote={onVote}
          onComments={onComments}
          onShare={onShare}
        />
      </motion.div>

      <AnimatePresence>
        {commentsOpen ? (
          <ViewerCommentsSheet
            onClose={onComments}
            onNotify={onNotify}
            post={post}
            reduceMotion={reduceMotion}
          />
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}

function SearchPanel({
  onClose,
  onOpen,
  query,
  setQuery,
}: {
  onClose: () => void;
  onOpen: (id: string) => void;
  query: string;
  setQuery: (value: string) => void;
}) {
  const playbackRate = usePrototypePlaybackRate();
  const reduceMotion = Boolean(useReducedMotion());
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = posts.filter((post) =>
    `${post.title} ${post.community}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <motion.section
      className={styles.searchPanel}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: motionDuration(0.16, playbackRate, reduceMotion) }}
      aria-label="Search posts"
    >
      <header>
        <button type="button" onClick={onClose} aria-label="Close search">
          <IOSIcon name="close" size={22} />
        </button>
        <label>
          <IOSIcon name="search" size={19} />
          <span className="sr-only">Search posts</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Reddit"
          />
        </label>
      </header>
      <div className={styles.searchResults}>
        {matches.length ? (
          matches.map((post) => (
            <button key={post.id} type="button" onClick={() => onOpen(post.id)}>
              <CommunityAvatar post={post} />
              <span>
                <strong>{post.title}</strong>
                <small>{post.community}</small>
              </span>
            </button>
          ))
        ) : (
          <div className={styles.emptySearch}>
            <RedditIcon name="search" size={29} />
            <strong>No posts found</strong>
            <span>Try kittens, tickets, or Ralph.</span>
          </div>
        )}
      </div>
    </motion.section>
  );
}

function NavigationDrawer({ onClose, onNotify }: { onClose: () => void; onNotify: (message: string) => void }) {
  const playbackRate = usePrototypePlaybackRate();
  const reduceMotion = Boolean(useReducedMotion());
  const items = ["Home", "Popular", "Latest", "All"];
  const communities = ["r/aww", "r/CasualUK", "r/AskReddit", "r/Adelaide"];
  return (
    <>
      <motion.button
        type="button"
        className={styles.drawerScrim}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-label="Close navigation"
      />
      <motion.aside
        className={styles.navigationDrawer}
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={motionSpring(playbackRate, reduceMotion)}
      >
        <header>
          <span className={styles.drawerLogo} aria-hidden="true">
            <Image
              className={styles.drawerLogoImage}
              src={withBasePath("/reddit-seamless/reddit-symbol.png")}
              alt=""
              fill
              sizes="30px"
              unoptimized
            />
          </span>
          <strong>reddit</strong>
          <button type="button" onClick={onClose} aria-label="Close navigation">
            <IOSIcon name="close" size={22} />
          </button>
        </header>
        <nav aria-label="Feed navigation">
          {items.map((item) => (
            <button key={item} type="button" data-active={item === "Home" || undefined} onClick={() => onNotify(`${item} feed selected`)}>
              <RedditIcon name="homeFill" size={20} />
              <span>{item}</span>
            </button>
          ))}
          <h2>Your communities</h2>
          {communities.map((community) => {
            const communityPost = posts.find((post) => post.community === community) ?? posts[0];
            return (
              <button key={community} type="button" onClick={() => onNotify(`${community} opened`)}>
                <CommunityAvatar post={communityPost} />
                <span>{community}</span>
              </button>
            );
          })}
        </nav>
      </motion.aside>
    </>
  );
}

function FeedMenu({ onSelect }: { onSelect: (label: string) => void }) {
  const playbackRate = usePrototypePlaybackRate();
  const reduceMotion = Boolean(useReducedMotion());

  return (
    <motion.div
      className={styles.feedMenu}
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: motionDuration(0.14, playbackRate, reduceMotion) }}
      role="menu"
    >
      {["Home", "Popular", "Latest"].map((label) => (
        <button key={label} type="button" role="menuitem" onClick={() => onSelect(label)}>
          {label === "Home" ? (
            <RedditIcon name="homeFill" size={20} />
          ) : label === "Popular" ? (
            <RedditIcon name="upvote" size={20} />
          ) : (
            <CheckCircle size={20} />
          )}
          <span>{label}</span>
          {label === "Home" ? <CheckCircle size={18} weight="fill" /> : null}
        </button>
      ))}
    </motion.div>
  );
}

function HomeIndicator({ dark }: { dark: boolean }) {
  return <span className={styles.homeIndicator} data-dark={dark || undefined} aria-hidden="true" />;
}

function PlaybackSpeedToggle({
  playbackRate,
  onToggle,
}: {
  playbackRate: PlaybackRate;
  onToggle: () => void;
}) {
  const slowMotion = playbackRate === 0.25;

  return (
    <aside className={styles.speedControl} aria-label="Prototype playback controls">
      <span className={styles.speedControlLabel}>
        <strong>Slow motion</strong>
        <output aria-live="polite">{slowMotion ? "0.25×" : "1×"}</output>
      </span>
      <button
        className={styles.speedToggle}
        type="button"
        role="switch"
        aria-checked={slowMotion}
        aria-label={`Slow motion ${slowMotion ? "on at 0.25×" : "off at 1×"}`}
        onClick={onToggle}
      >
        <span />
      </button>
    </aside>
  );
}

type RedditSeamlessPrototypeProps = {
  ariaLabelledBy?: string;
  variant?: "page" | "playground";
};

export function RedditSeamlessPrototype({
  ariaLabelledBy,
  variant = "page",
}: RedditSeamlessPrototypeProps = {}) {
  const embedded = variant === "playground";
  const reduceMotion = Boolean(useReducedMotion());
  const feedDetailProgress = useMotionValue(0);
  const viewerOpenProgress = useMotionValue(0);
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1);
  const [screen, setScreen] = useState<Screen>("feed");
  const [activePostId, setActivePostId] = useState("kitten");
  const [commentsFirst, setCommentsFirst] = useState(false);
  const [detailMediaStartTime, setDetailMediaStartTime] = useState<number>();
  const [detailTransition, setDetailTransition] = useState<FeedDetailTransition | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerDirection, setViewerDirection] = useState(1);
  const [viewerEntryMode, setViewerEntryMode] = useState<ViewerEntryMode>("media");
  const [viewerOrigin, setViewerOrigin] = useState<Exclude<Screen, "viewer">>("detail");
  const [viewerOriginPostId, setViewerOriginPostId] = useState("kitten");
  const [viewerCommentsOpen, setViewerCommentsOpen] = useState(false);
  const [viewerMediaStartTime, setViewerMediaStartTime] = useState<number>();
  const [viewerOpenTransition, setViewerOpenTransition] = useState<ViewerOpenTransition | null>(null);
  const [viewerCloseTransition, setViewerCloseTransition] = useState<ViewerCloseTransition | null>(null);
  const [upvoted, setUpvoted] = useState<Set<string>>(() => new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [feedMenuOpen, setFeedMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [feedInitialScroll, setFeedInitialScroll] = useState(298);
  const feedScrollerRef = useRef<HTMLDivElement>(null);
  const screenSurfaceRef = useRef<HTMLDivElement>(null);
  const prototypeRootRef = useRef<HTMLElement | null>(null);
  const prototypeActiveRef = useRef(!embedded);
  const feedOriginRef = useRef<{
    identity?: PostIdentityRects;
    media?: RelativeRect;
    postId: string;
    article: RelativeRect;
  } | null>(null);
  const transitionTokenRef = useRef(0);
  const viewerTransitionTokenRef = useRef(0);
  const transitionHandoffFrame = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);

  const detailAnchorId = screen === "viewer" ? viewerOriginPostId : activePostId;
  const detailAnchorPost = posts.find((post) => post.id === detailAnchorId) ?? posts[2];
  const mediaPosts = useMemo(() => posts.filter((post) => post.media), []);
  const viewerPost = mediaPosts[viewerIndex] ?? mediaPosts[0];
  const transitionPost = posts.find((post) => post.id === detailTransition?.postId) ?? detailAnchorPost;
  const viewerCloseSourcePost = posts.find((post) => post.id === viewerCloseTransition?.sourcePostId) ?? viewerPost;
  const viewerCloseOriginPost = posts.find((post) => post.id === viewerCloseTransition?.originPostId) ?? detailAnchorPost;

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 1900);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      if (transitionHandoffFrame.current) window.cancelAnimationFrame(transitionHandoffFrame.current);
    },
    [],
  );

  useEffect(() => {
    if (detailTransition) return;
    feedDetailProgress.set(screen === "feed" ? 0 : 1);
  }, [detailTransition, feedDetailProgress, screen]);

  useLayoutEffect(() => {
    if (!viewerOpenTransition || viewerOpenTransition.targetMedia || screen !== "viewer") return;
    const surface = screenSurfaceRef.current;
    if (!surface) return;
    const targetElement = surface.querySelector<HTMLElement>(
      `[data-viewer-media="${viewerOpenTransition.postId}"]`,
    );
    const post = posts.find((candidate) => candidate.id === viewerOpenTransition.postId) ?? viewerPost;
    const targetMedia = relativeRect(targetElement, surface) ?? viewerTargetRect(post, surface);
    setViewerOpenTransition((current) => (
      current?.token === viewerOpenTransition.token
        ? { ...current, targetMedia }
        : current
    ));
  }, [screen, viewerOpenTransition, viewerPost]);

  const openDetail = useCallback((id: string, origin?: FeedPostOrigin, jumpToComments = false) => {
    if (detailTransition) return;
    if (feedScrollerRef.current) setFeedInitialScroll(feedScrollerRef.current.scrollTop);
    setActivePostId(id);
    setCommentsFirst(jumpToComments);
    setFeedMenuOpen(false);
    setSearchOpen(false);
    setDrawerOpen(false);
    const surface = screenSurfaceRef.current;
    const fallbackArticle = surface?.querySelector<HTMLElement>(`[data-post-id="${id}"]`) ?? null;
    const articleElement = origin?.article ?? fallbackArticle;
    const mediaElement = origin?.media
      ?? articleElement?.querySelector<HTMLElement>(`[data-transition-media="${id}"]`)
      ?? null;
    const article = relativeRect(articleElement, surface);
    const media = relativeRect(mediaElement, surface) ?? undefined;
    const sourceIdentity = postIdentityRects(articleElement, surface);

    if (!surface || !article) {
      setDetailMediaStartTime(undefined);
      setScreen("detail");
      return;
    }

    const video = mediaElement?.querySelector("video");
    const mediaTime = video instanceof HTMLVideoElement && Number.isFinite(video.currentTime)
      ? video.currentTime
      : undefined;
    const token = ++transitionTokenRef.current;
    feedOriginRef.current = { postId: id, article, identity: sourceIdentity, media };
    setDetailTransition({
      capturedAt: performance.now(),
      commentsFirst: jumpToComments,
      direction: "opening",
      mediaTime,
      playbackRate,
      postId: id,
      sourceArticle: article,
      sourceIdentity,
      sourceMedia: media,
      surfaceHeight: surface.offsetHeight,
      surfaceWidth: surface.offsetWidth,
      token,
    });
  }, [detailTransition, playbackRate]);

  const returnToFeed = useCallback(() => {
    if (detailTransition) return;
    const surface = screenSurfaceRef.current;
    const storedOrigin = feedOriginRef.current?.postId === activePostId ? feedOriginRef.current : null;
    const fallbackArticle = surface?.querySelector<HTMLElement>(`[data-post-id="${activePostId}"]`) ?? null;
    const fallbackMedia = fallbackArticle?.querySelector<HTMLElement>(`[data-transition-media="${activePostId}"]`) ?? null;
    const article = storedOrigin?.article ?? relativeRect(fallbackArticle, surface);
    const media = storedOrigin?.media ?? relativeRect(fallbackMedia, surface) ?? undefined;
    const sourceIdentity = storedOrigin?.identity ?? postIdentityRects(fallbackArticle, surface);
    const detailVideo = surface?.querySelector<HTMLVideoElement>(`[data-screen="detail"] video`);
    const detailMediaElement = surface?.querySelector<HTMLElement>(`[data-detail-media="${activePostId}"]`) ?? null;
    const detailPostElement = surface?.querySelector<HTMLElement>(`[data-detail-post="${activePostId}"]`) ?? null;
    const detailMedia = relativeRect(detailMediaElement, surface);
    const targetIdentity = postIdentityRects(detailPostElement, surface);
    const mediaTime = detailVideo && Number.isFinite(detailVideo.currentTime) ? detailVideo.currentTime : undefined;

    setCommentsFirst(false);
    if (!surface || !article) {
      setScreen("feed");
      return;
    }

    const token = ++transitionTokenRef.current;
    setDetailTransition({
      capturedAt: performance.now(),
      commentsFirst: false,
      canvasOffset: media && detailMedia
        ? media.top - detailMedia.top
        : article.top - 99,
      direction: "closing",
      mediaTime,
      playbackRate,
      postId: activePostId,
      sourceArticle: article,
      sourceIdentity,
      sourceMedia: media,
      surfaceHeight: surface.offsetHeight,
      surfaceWidth: surface.offsetWidth,
      targetIdentity,
      token,
    });
    setScreen("feed");
  }, [activePostId, detailTransition, playbackRate]);

  const completeDetailTransition = useCallback((completedTransition: FeedDetailTransition) => {
    if (transitionTokenRef.current !== completedTransition.token) return;
    if (completedTransition.direction === "opening") {
      const elapsed = ((performance.now() - completedTransition.capturedAt) / 1000)
        * completedTransition.playbackRate;
      setDetailMediaStartTime(
        completedTransition.mediaTime === undefined ? undefined : completedTransition.mediaTime + elapsed,
      );
      setCommentsFirst(completedTransition.commentsFirst);
      setScreen("detail");
    }
    if (transitionHandoffFrame.current) window.cancelAnimationFrame(transitionHandoffFrame.current);
    transitionHandoffFrame.current = window.requestAnimationFrame(() => {
      setDetailTransition((current) => current?.token === completedTransition.token ? null : current);
      transitionHandoffFrame.current = null;
    });
  }, []);

  const openViewer = useCallback((entryMode: ViewerEntryMode) => {
    if (viewerCloseTransition || viewerOpenTransition) return;
    const nextIndex = mediaPosts.findIndex((post) => post.id === activePostId);
    setViewerIndex(Math.max(0, nextIndex));
    setViewerDirection(0);
    setViewerEntryMode(entryMode);
    setViewerOrigin("detail");
    setViewerOriginPostId(activePostId);
    setViewerCommentsOpen(false);
    if (entryMode === "media") {
      const surface = screenSurfaceRef.current;
      const sourceElement = surface?.querySelector<HTMLElement>(
        `[data-detail-media="${activePostId}"]`,
      ) ?? null;
      const sourceVideo = sourceElement?.querySelector("video");
      const sourceMediaTime = sourceVideo instanceof HTMLVideoElement && Number.isFinite(sourceVideo.currentTime)
        ? sourceVideo.currentTime
        : undefined;
      const token = ++viewerTransitionTokenRef.current;
      viewerOpenProgress.set(0);
      setViewerMediaStartTime(sourceMediaTime);
      setViewerOpenTransition({
        capturedAt: performance.now(),
        entryMode,
        playbackRate,
        postId: activePostId,
        sourceMedia: relativeRect(sourceElement, surface) ?? undefined,
        sourceMediaTime,
        token,
      });
    } else {
      setViewerMediaStartTime(undefined);
    }
    setScreen("viewer");
  }, [activePostId, mediaPosts, playbackRate, viewerCloseTransition, viewerOpenProgress, viewerOpenTransition]);

  const completeViewerOpen = useCallback((completedTransition: ViewerOpenTransition) => {
    if (viewerTransitionTokenRef.current !== completedTransition.token) return;
    viewerOpenProgress.set(1);
    setViewerOpenTransition((current) => current?.token === completedTransition.token ? null : current);
  }, [viewerOpenProgress]);

  const closeViewer = useCallback(() => {
    if (viewerCloseTransition || viewerOpenTransition) return;
    const surface = screenSurfaceRef.current;
    const sourceElement = surface?.querySelector<HTMLElement>(`[data-viewer-media="${viewerPost.id}"]`) ?? null;
    const targetSelector = viewerEntryMode === "sticky"
      ? `[data-screen="detail"] [data-variant="sticky"]`
      : `[data-screen="detail"] [data-detail-media="${viewerOriginPostId}"]`;
    const targetElement = surface?.querySelector<HTMLElement>(targetSelector) ?? null;
    const sourceVideo = sourceElement?.querySelector("video");
    const targetVideo = targetElement?.querySelector("video");
    const sourceMediaTime = sourceVideo instanceof HTMLVideoElement && Number.isFinite(sourceVideo.currentTime)
      ? sourceVideo.currentTime
      : undefined;
    const targetMediaTime = targetVideo instanceof HTMLVideoElement && Number.isFinite(targetVideo.currentTime)
      ? targetVideo.currentTime
      : undefined;
    const token = ++viewerTransitionTokenRef.current;

    setViewerCommentsOpen(false);
    setViewerDirection(0);
    setViewerCloseTransition({
      capturedAt: performance.now(),
      entryMode: viewerEntryMode,
      originPostId: viewerOriginPostId,
      playbackRate,
      sourceMedia: relativeRect(sourceElement, surface) ?? undefined,
      sourceMediaTime,
      sourcePostId: viewerPost.id,
      targetMedia: relativeRect(targetElement, surface) ?? undefined,
      targetMediaTime,
      token,
    });
  }, [playbackRate, viewerCloseTransition, viewerEntryMode, viewerOpenTransition, viewerOriginPostId, viewerPost]);

  const completeViewerClose = useCallback((completedTransition: ViewerCloseTransition) => {
    if (viewerTransitionTokenRef.current !== completedTransition.token) return;
    const elapsed = ((performance.now() - completedTransition.capturedAt) / 1000)
      * completedTransition.playbackRate;
    const returnMediaTime = completedTransition.sourcePostId === completedTransition.originPostId
      ? completedTransition.sourceMediaTime
      : completedTransition.targetMediaTime;
    setDetailMediaStartTime(returnMediaTime === undefined ? undefined : returnMediaTime + elapsed);
    setActivePostId(completedTransition.originPostId);
    setScreen(viewerOrigin);
    setViewerCloseTransition((current) => current?.token === completedTransition.token ? null : current);
  }, [viewerOrigin]);

  const navigateViewer = useCallback(
    (delta: number) => {
      if (viewerCloseTransition || viewerOpenTransition) return;
      const nextIndex = Math.min(mediaPosts.length - 1, Math.max(0, viewerIndex + delta));
      if (nextIndex === viewerIndex) {
        notify(delta > 0 ? "You're all caught up" : "This is the first post");
        return;
      }
      setViewerMediaStartTime(undefined);
      setViewerDirection(delta);
      setViewerIndex(nextIndex);
      setActivePostId(mediaPosts[nextIndex].id);
    },
    [mediaPosts, notify, viewerCloseTransition, viewerIndex, viewerOpenTransition],
  );

  const toggleVote = useCallback((id: string) => {
    setUpvoted((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const sharePost = useCallback(
    async (post: Post) => {
      const prototypeUrl = embedded
        ? `${window.location.origin}${withBasePath("/reddit-seamless/")}`
        : window.location.href.split("#")[0];
      const url = `${prototypeUrl}#${post.id}`;
      try {
        await navigator.clipboard.writeText(url);
        notify("Post link copied");
      } catch {
        notify("Share link ready");
      }
    },
    [embedded, notify],
  );

  useEffect(() => {
    if (!embedded) return;

    function onPointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !prototypeRootRef.current?.contains(event.target)
      ) {
        prototypeActiveRef.current = false;
      }
    }

    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [embedded]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (embedded && !prototypeActiveRef.current) return;
      if (event.key === "Escape") {
        if (drawerOpen) setDrawerOpen(false);
        else if (searchOpen) setSearchOpen(false);
        else if (feedMenuOpen) setFeedMenuOpen(false);
        else if (screen === "viewer" && viewerCommentsOpen) setViewerCommentsOpen(false);
        else if (screen === "viewer") closeViewer();
        else if (screen === "detail") returnToFeed();
      }
      if (screen === "viewer" && !viewerCommentsOpen && event.key === "ArrowRight") navigateViewer(1);
      if (screen === "viewer" && !viewerCommentsOpen && event.key === "ArrowLeft") navigateViewer(-1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeViewer, drawerOpen, embedded, feedMenuOpen, navigateViewer, returnToFeed, screen, searchOpen, viewerCommentsOpen]);

  const isViewer = screen === "viewer";
  const Root = embedded ? "div" : "section";

  return (
    <Root
      ref={(node) => {
        prototypeRootRef.current = node;
      }}
      className={`${styles.prototype} ${
        embedded ? styles.playgroundVariant : "reddit-prototype-page"
      }`}
      data-reddit-seamless-variant={variant}
      data-playback-rate={playbackRate}
      aria-labelledby={embedded ? ariaLabelledBy : undefined}
      aria-label={
        embedded && ariaLabelledBy
          ? undefined
          : "Reddit seamless feed to post experience prototype"
      }
      onPointerDownCapture={() => {
        prototypeActiveRef.current = true;
      }}
      onFocusCapture={() => {
        prototypeActiveRef.current = true;
      }}
    >
      <PlaybackRateContext.Provider value={playbackRate}>
        {!embedded ? (
          <h1 className="sr-only">Reddit seamless feed to post experience</h1>
        ) : null}
        <div className={styles.stage}>
          {!embedded ? (
            <div className={styles.prototypeControls}>
              <PlaybackSpeedToggle
                playbackRate={playbackRate}
                onToggle={() =>
                  setPlaybackRate((current) => (current === 1 ? 0.25 : 1))
                }
              />
            </div>
          ) : null}
          <div className={styles.deviceFrame} data-device-frame>
            <span className={styles.frameActionButton} aria-hidden="true" />
            <div className={styles.deviceShell} data-device-shell>
              <div className={styles.screenSurface} data-device-screen-clip>
                <div className={styles.screenCanvas} data-device-screen ref={screenSurfaceRef}>
            <StatusBar dark={isViewer} />
            <LayoutGroup id="reddit-seamless-flow">
              <AnimatePresence initial={false}>
                <FeedScreen
                  key="feed"
                  active={screen === "feed"}
                  transition={detailTransition}
                  transitionProgress={feedDetailProgress}
                  feedScrollerRef={feedScrollerRef}
                  initialScroll={feedInitialScroll}
                  reduceMotion={reduceMotion}
                  upvoted={upvoted}
                  onMenu={() => setDrawerOpen(true)}
                  onFeedMenu={() => setFeedMenuOpen((value) => !value)}
                  onSearch={() => setSearchOpen(true)}
                  onAvatar={() => notify("Profile opened")}
                  onOpen={(id, origin) => openDetail(id, origin)}
                  onComments={(id, origin) => openDetail(id, origin, true)}
                  onOverflow={() => notify("Post options opened")}
                  onShare={sharePost}
                  onVote={toggleVote}
                  onUnavailable={(label) => notify(`${label} is outside this prototype`)}
                />

                {screen !== "feed" ? (
                  <DetailScreen
                    key={`detail-${detailAnchorPost.id}`}
                    post={detailAnchorPost}
                    commentsFirst={commentsFirst}
                    hideViewerReturnTarget={Boolean(viewerOpenTransition || viewerCloseTransition)}
                    reduceMotion={reduceMotion}
                    suppressViewerLayout={screen === "viewer"}
                    mediaStartTime={detailMediaStartTime}
                    isUpvoted={upvoted.has(detailAnchorPost.id)}
                    onBack={returnToFeed}
                    onNotify={notify}
                    onOpenViewer={openViewer}
                    onVote={() => toggleVote(detailAnchorPost.id)}
                    onShare={() => sharePost(detailAnchorPost)}
                  />
                ) : null}

                {screen === "viewer" ? (
                  <ViewerScreen
                    key="viewer"
                    closing={Boolean(viewerCloseTransition)}
                    mediaPosts={mediaPosts}
                    currentIndex={viewerIndex}
                    direction={viewerDirection}
                    entryMode={viewerEntryMode}
                    commentsOpen={viewerCommentsOpen}
                    reduceMotion={reduceMotion}
                    isUpvoted={upvoted.has(viewerPost.id)}
                    mediaStartTime={viewerMediaStartTime}
                    opening={Boolean(viewerOpenTransition)}
                    openingProgress={viewerOpenProgress}
                    onClose={closeViewer}
                    onComments={() => {
                      if (!viewerOpenTransition) setViewerCommentsOpen((value) => !value);
                    }}
                    onNavigate={navigateViewer}
                    onNotify={notify}
                    onVote={() => toggleVote(viewerPost.id)}
                    onShare={() => sharePost(viewerPost)}
                  />
                ) : null}
              </AnimatePresence>
            </LayoutGroup>

            {detailTransition ? (
              <FeedDetailTransitionLayer
                key={detailTransition.token}
                transition={detailTransition}
                transitionProgress={feedDetailProgress}
                post={transitionPost}
                reduceMotion={reduceMotion}
                isUpvoted={upvoted.has(transitionPost.id)}
                onComplete={() => completeDetailTransition(detailTransition)}
              />
            ) : null}

            {viewerOpenTransition ? (
              <ViewerOpenTransitionLayer
                key={viewerOpenTransition.token}
                transition={viewerOpenTransition}
                progress={viewerOpenProgress}
                post={viewerPost}
                reduceMotion={reduceMotion}
                onComplete={() => completeViewerOpen(viewerOpenTransition)}
              />
            ) : null}

            {viewerCloseTransition ? (
              <ViewerCloseTransitionLayer
                key={viewerCloseTransition.token}
                transition={viewerCloseTransition}
                currentPost={viewerCloseSourcePost}
                originPost={viewerCloseOriginPost}
                reduceMotion={reduceMotion}
                onComplete={() => completeViewerClose(viewerCloseTransition)}
              />
            ) : null}

            <AnimatePresence>
              {screen === "feed" && drawerOpen ? (
                <NavigationDrawer key="drawer" onClose={() => setDrawerOpen(false)} onNotify={notify} />
              ) : null}
              {screen === "feed" && feedMenuOpen ? (
                <FeedMenu
                  key="feed-menu"
                  onSelect={(label) => {
                    notify(`${label} feed selected`);
                    setFeedMenuOpen(false);
                  }}
                />
              ) : null}
              {screen === "feed" && searchOpen ? (
                <SearchPanel
                  key="search"
                  query={query}
                  setQuery={setQuery}
                  onClose={() => setSearchOpen(false)}
                  onOpen={(id) => openDetail(id)}
                />
              ) : null}
            </AnimatePresence>

            <HomeIndicator dark={isViewer} />

            <AnimatePresence>
              {toast ? (
                <motion.output
                  className={styles.toast}
                  initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: motionDuration(0.18, playbackRate, reduceMotion) }}
                  aria-live="polite"
                >
                  {toast}
                </motion.output>
              ) : null}
            </AnimatePresence>

                </div>
              </div>
            </div>
          </div>
        </div>
      </PlaybackRateContext.Provider>
    </Root>
  );
}
