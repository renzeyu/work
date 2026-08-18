import { ProjectView } from "../components/ProjectView";
import { getProjectMetadata, getProjectPage } from "../lib/project-page";

const project = getProjectPage("brand-refresh-launch");
export const metadata = getProjectMetadata(project);

export default function BrandRefreshPage() {
  return <ProjectView project={project} />;
}
