import type { Metadata } from "next";
import type { PortfolioProject } from "./portfolio";
import { portfolio, projectBySlug } from "./portfolio";
import { absoluteSiteUrl } from "./site";

export function getProjectPage(slug: string): PortfolioProject {
  const project = projectBySlug.get(slug);
  if (!project) throw new Error(`Unknown portfolio project: ${slug}`);
  return project;
}

export function getProjectMetadata(project: PortfolioProject): Metadata {
  const cover = portfolio.covers.find((item) => item.slug === project.slug);
  const description = `${project.title}, a motion design case study by Zeyu Ren.`;
  const image = absoluteSiteUrl(
    cover ? cover.asset.poster ?? cover.asset.src : "/og.jpg",
  );
  const socialTitle = `Zeyu Ren - ${project.title}`;
  const projectUrl = absoluteSiteUrl(`/${project.slug}/`);
  return {
    title: project.title,
    description,
    alternates: { canonical: projectUrl },
    openGraph: {
      type: "website",
      url: projectUrl,
      siteName: "Zeyu Ren",
      title: socialTitle,
      description,
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [image],
    },
  };
}
