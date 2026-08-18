import type { Metadata } from "next";
import { ContactForm } from "../components/ContactForm";
import { RichText } from "../components/RichText";
import { portfolio } from "../lib/portfolio";
import { absoluteSiteUrl } from "../lib/site";

export const metadata: Metadata = {
  title: "About",
  description: "About Zeyu Ren, a product motion designer working across interaction and motion systems.",
  alternates: { canonical: absoluteSiteUrl("/contact/") },
  openGraph: {
    type: "website",
    url: absoluteSiteUrl("/contact/"),
    siteName: "Zeyu Ren",
    title: "Zeyu Ren - About",
    description: "About Zeyu Ren, a product motion designer working across interaction and motion systems.",
    images: [{ url: absoluteSiteUrl("/og.jpg"), width: 1916, height: 1080 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zeyu Ren - About",
    description: "About Zeyu Ren, a product motion designer working across interaction and motion systems.",
    images: [absoluteSiteUrl("/og.jpg")],
  },
};

export default function ContactPage() {
  return (
    <article className="about-page">
      <header className="project-heading">
        <h1>{portfolio.about.title}</h1>
      </header>
      <div className="about-copy project-copy">
        <RichText html={portfolio.about.html} />
      </div>
      <ContactForm />
    </article>
  );
}
