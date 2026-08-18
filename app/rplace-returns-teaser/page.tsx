import { ProjectView } from "../components/ProjectView";
import { getProjectMetadata, getProjectPage } from "../lib/project-page";

const project = getProjectPage("rplace-returns-teaser");
export const metadata = getProjectMetadata(project);

export default function RPlacePage() {
  return <ProjectView project={project} />;
}
