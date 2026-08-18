import { ProjectView } from "../components/ProjectView";
import { getProjectMetadata, getProjectPage } from "../lib/project-page";

const project = getProjectPage("2024-reel");
export const metadata = getProjectMetadata(project);

export default function ReelPage() {
  return <ProjectView project={project} />;
}
