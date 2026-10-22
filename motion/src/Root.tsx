import { Composition } from "remotion";
import { AccessControl } from "./AccessControl";
import { ChatAssistant } from "./ChatAssistant";
import { DataPipelines } from "./DataPipelines";
import { DocParse } from "./DocParse";
import { Hardware } from "./Hardware";
import { Knowledge } from "./Knowledge";
import { Localization } from "./Localization";
import { MindSplit, MindSplitPreview } from "./MindSplit";
import { OpsDashboard } from "./OpsDashboard";
import { VoiceAI } from "./VoiceAI";
import { Workflow } from "./Workflow";

/** Output name = `public/videos/services/<id>.mp4`, in the order of each pillar's slides. */
const SCENES = {
  "systems-1": OpsDashboard,
  "systems-2": Localization,
  "systems-3": DataPipelines,
  "systems-4": AccessControl,
  "systems-5": Hardware,
  "ai-1": VoiceAI,
  "ai-2": Workflow,
  "ai-3": Knowledge,
  "ai-4": DocParse,
  "ai-5": ChatAssistant,
};

export const Root = () => (
  <>
    {Object.entries(SCENES).map(([id, Component]) => (
      <Composition key={id} id={id} component={Component} durationInFrames={240} fps={30} width={1920} height={1080} />
    ))}
    <Composition id="mind-split" component={MindSplit} durationInFrames={150} fps={30} width={1920} height={1080} />
    <Composition id="mind-split-preview" component={MindSplitPreview} durationInFrames={240} fps={30} width={1920} height={1080} />
  </>
);
