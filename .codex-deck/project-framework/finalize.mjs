import path from 'node:path';
import {pathToFileURL} from 'node:url';
const ROOT='C:/Users/DELL/Vakil-Setu';
const SKILL='C:/Users/DELL/.codex/plugins/cache/openai-primary-runtime/presentations/26.1013.11914/skills/presentations';
const {finalizePresentation}=await import(pathToFileURL(path.join(SKILL,'container_tools/artifact_tool_utils.mjs')).href);
console.log(JSON.stringify(await finalizePresentation({
 workspaceDir:ROOT,candidatePath:path.join(ROOT,'.codex-deck/project-framework/candidate.pptx'),
 finalPath:path.join(ROOT,'output/project-presentation/Vakil_Setu_PROJECT_Deck.pptx'),
 pythonExecutable:'C:/Users/DELL/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',
 integrityValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],
 explicitTotalSlideCount:14,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],
 fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,
 receiptPath:path.join(ROOT,'.codex-deck/project-framework/final-validation.json')
})));
