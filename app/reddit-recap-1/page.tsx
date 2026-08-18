import { ProjectView } from "../components/ProjectView";
import { getProjectMetadata, getProjectPage } from "../lib/project-page";

const project = getProjectPage("reddit-recap-1");
export const metadata = getProjectMetadata(project);

export default function RedditRecapPage() {
  return <ProjectView project={project} />;
}
