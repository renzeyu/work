import { ProjectView } from "../components/ProjectView";
import { getProjectMetadata, getProjectPage } from "../lib/project-page";

const project = getProjectPage("reddit-motion-design-system");
export const metadata = getProjectMetadata(project);

export default function MotionSystemPage() {
  return <ProjectView project={project} />;
}
