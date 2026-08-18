import { ProjectView } from "../components/ProjectView";
import { getProjectMetadata, getProjectPage } from "../lib/project-page";

const project = getProjectPage("collectable-avatars-launch-video");
export const metadata = getProjectMetadata(project);

export default function CollectableAvatarsPage() {
  return <ProjectView project={project} />;
}
