import type { Metadata } from 'next';
import { absoluteSiteUrl } from '../lib/site';
import { RedditRecapPrototype } from './RedditRecapPrototype';

export const metadata: Metadata = {
  title: 'Reddit Recap 2022 Prototype',
  description:
    'An interactive reconstruction of the 2022 Reddit Recap mobile experience.',
  alternates: { canonical: absoluteSiteUrl('/reddit-recap-2022/') },
};

export default function RedditRecapPage() {
  return <RedditRecapPrototype />;
}
