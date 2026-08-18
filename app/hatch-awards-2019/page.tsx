import { ProjectView } from "../components/ProjectView";
import { getProjectMetadata, getProjectPage } from "../lib/project-page";

const project = getProjectPage("hatch-awards-2019");
export const metadata = getProjectMetadata(project);

export default function HatchAwardsPage() {
  return <ProjectView project={project} />;
}
