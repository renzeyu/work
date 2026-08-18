import { ProjectView } from "../components/ProjectView";
import { getProjectMetadata, getProjectPage } from "../lib/project-page";

const project = getProjectPage("nihonto-enter-the-swordsmith");
export const metadata = getProjectMetadata(project);

export default function NihontoPage() {
  return <ProjectView project={project} />;
}
