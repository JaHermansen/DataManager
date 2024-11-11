import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as CUI from "@thatopen/ui-obc";
import * as OBF from "@thatopen/components-front";

//import groupings from "./Sections/Groupings";

export default (components: OBC.Components) => {
    const [modelsList] = CUI.tables.modelsList({
        components,
    });
    const [relationsTree] = CUI.tables.relationsTree({
    components,
    models: [],
    hoverHighlighterName: "hover",
    selectHighlighterName: "select",
    });
    relationsTree.preserveStructureOnFilter = true;

    const search = (e: Event) => {
    const input = e.target as BUI.TextInput;
    relationsTree.queryString = input.value;
    };

    const fragments = components.get(OBC.FragmentsManager);

    const [classificationsTree, updateClassificationsTree] =
        CUI.tables.classificationTree({
            components,
            classifications: [],
            hoverHighlighterName: "hover",
            selectHighlighterName: "select",
        });
    const classifier = components.get(OBC.Classifier);
    const highlighter = components.get(OBF.Highlighter);

    fragments.onFragmentsLoaded.add(async (model) => {
        // This creates a classification system named "entities"
        classifier.byEntity(model);


        const classifications = [
            { system: "entities", label: "Entities" },

        ];

        updateClassificationsTree({ classifications });
    });

    const search1 = (e: Event) => {
        const input = e.target as BUI.TextInput;
        classificationsTree.queryString = input.value;
    };


    const getRowFragmentIdMap = (row: BUI.TableRow) => {
        const { system, Name } = row.data as { system: string; Name: string };
        const groups = classifier.list[system];
        if (!groups) return null;
        const groupData = groups[Name];
        if (!groupData) return null;
        return groupData.map;
    };

    classificationsTree.addEventListener("rowcreated", (e) => {
        e.stopImmediatePropagation();
        const { row } = e.detail;
        const fragmentIDMap = getRowFragmentIdMap(row);
        if (!(fragmentIDMap && Object.keys(fragmentIDMap).length !== 0)) return;
        row.onmouseover = () => {
            row.style.backgroundColor = "var(--bim-ui_bg-contrast-20)";
            highlighter.highlightByID(
                "hover",
                fragmentIDMap,
                true,
                false,
                highlighter.selection["select"] ?? {},
            );
        };

        row.onmouseout = () => {
            row.style.backgroundColor = "";
            highlighter.clear("hover");
        };

        row.onclick = () => {
            highlighter.highlightByID(
                "select",
                fragmentIDMap,
                true,
                true
            )
        }
    });



  return BUI.Component.create<BUI.Panel>(() => {
    return BUI.html`
      <bim-panel>
        <bim-panel-section label="Loaded Models" icon="mage:box-3d-fill">
          ${modelsList}
        </bim-panel-section>
        <bim-panel-section label="Spatial Structures" icon="ph:tree-structure-fill">
          <div style="display: flex; gap: 0.375rem;">
            <bim-text-input @input=${search} vertical placeholder="Search..." debounce="200"></bim-text-input>
            <bim-button style="flex: 0;" @click=${() => (relationsTree.expanded = !relationsTree.expanded)} icon="eva:expand-fill"></bim-button>
          </div>
          ${relationsTree}
        </bim-panel-section>
            <bim-panel-section label="Entity Classification" icon="material-symbols:code">
            <bim-text-input @input=${search1} vertical placeholder="Search..." debounce="200"></bim-text-input>
            ${classificationsTree}
            </bim-panel> 
    `;
  });
};
