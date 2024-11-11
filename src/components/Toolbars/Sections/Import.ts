/* eslint-disable no-alert */
import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import * as CUI from "@thatopen/ui-obc";
import * as FRAGS from "@thatopen/fragments";
import Zip from "jszip";

const input = document.createElement("input");
const askForFile = (extension: string) => {
    return new Promise<File | null>((resolve) => {
        input.type = "file";
        input.accept = extension;
        input.multiple = false;
        input.onchange = () => {
            const filesList = input.files;
            if (!(filesList && filesList[0])) {
                resolve(null);
                return;
            }
            const file = filesList[0];
            resolve(file);
        };
        input.click();
    });
};

// Declare propsTable at the top level
let propsTable: any;

export default (components: OBC.Components) => {
    const [loadBtn] = CUI.buttons.loadIfc({ components });
    loadBtn.label = "IFC";
    loadBtn.tooltipTitle = "Load IFC";
    loadBtn.tooltipText =
        "Loads an IFC file into the scene. The IFC gets automatically converted to Fragments.";

    const fragments = components.get(OBC.FragmentsManager);
    const indexer = components.get(OBC.IfcRelationsIndexer);

    const loadFragments = async () => {
        const fragmentsZip = await askForFile(".zip");
        if (!fragmentsZip) return;
        const zipBuffer = await fragmentsZip.arrayBuffer();
        const zip = new Zip();
        await zip.loadAsync(zipBuffer);
        const geometryBuffer = zip.file("geometry.frag");
        if (!geometryBuffer) {
            alert("No geometry found in the file!");
            return;
        }

        const geometry = await geometryBuffer.async("uint8array");

        let properties: FRAGS.IfcProperties | undefined;
        const propsFile = zip.file("properties.json");
        if (propsFile) {
            const json = await propsFile.async("string");
            properties = JSON.parse(json);
            console.log("Loaded Properties:", properties); // Log properties
        }

        let relationsMap: OBC.RelationsMap | undefined;
        const relationsMapFile = zip.file("relations-map.json");
        if (relationsMapFile) {
            const json = await relationsMapFile.async("string");
            relationsMap = indexer.getRelationsMapFromJSON(json);
            console.log("Loaded Relations Map:", relationsMap); // Log relations map
        }

        fragments.load(geometry, { properties, relationsMap });
        console.log("Fragments loaded with geometry, properties, and relations map");

        // Store properties in a table for later export
        if (properties) {
            const [table, updateTable] = CUI.tables.elementProperties({
                components,
                fragmentIdMap: {},
            });
            updateTable(properties);
            // Store the table in the global variable
            propsTable = table;
            console.log("propsTable initialized:", propsTable); // Log propsTable initialization
        }
    };


    async function download(file: File) {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(file);
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    async function exportFragments() {
        if (!fragments.groups.size) {
            return;
        }
        const group = Array.from(fragments.groups.values())[0];
        const data = fragments.export(group);
        download(new File([new Blob([data])], "geometry.frag"));

        const properties = group.getLocalProperties();
        if (properties) {
            download(new File([JSON.stringify(properties)], "geometry.json"));
        }
    }


    function updatePropsTable(properties: FRAGS.IfcProperties) {
        throw new Error("Function not implemented.");
    }


    async function exportFragscsv() {
        if (!fragments.groups.size) {
            console.warn("No groups found in fragments.");
            return;
        }

        const group = Array.from(fragments.groups.values())[0];
        console.log("Group:", group);

        const properties = propsTable; // Use the globally stored properties
        console.log("Properties from propsTable:", properties);

        if (properties) {
            // Prepare CSV data
            const csvRows = [];
            csvRows.push("UUID,Property Set,Property Name,Property Value"); // Header row

            // Iterate through each item in the group
            group.items.forEach((item: any) => {
                const uuid = item.mesh.uuid;
                console.log("Processing item with UUID:", uuid);

                // Use item.ids to retrieve properties
                item.ids.forEach((id: number) => {
                    const itemProperties = properties[id]; // Assuming properties are indexed by item IDs
                    console.log("Item properties:", itemProperties);

                    if (itemProperties) {
                        Object.keys(itemProperties).forEach((propertySet) => {
                            const props = itemProperties[propertySet];
                            Object.keys(props).forEach((propName) => {
                                const propValue = props[propName];
                                csvRows.push(`${uuid},${propertySet},${propName},${propValue}`);
                            });
                        });
                    }
                });
            });

            // Create a CSV file
            const csvContent = csvRows.join("\n");
            const csvFile = new File([csvContent], "properties.csv", { type: "text/csv" });

            // Download the CSV file
            download(csvFile);
        } else {
            console.warn("No properties found in propsTable.");
        }
    }





    return BUI.Component.create<BUI.PanelSection>(() => {
        return BUI.html`
      <bim-toolbar-section label="Import/Export" icon="solar:import-bold">
        ${loadBtn}
        <bim-button @click=${loadFragments} label="Fragments" icon="fluent:puzzle-cube-piece-20-filled" tooltip-title="Load Fragments"
          tooltip-text="Loads a pre-converted IFC from a Fragments file. Use this option if you want to avoid the conversion from IFC to Fragments."></bim-button>
        <bim-button label="Export fragments" @click="${exportFragments}" icon="fluent:puzzle-cube-piece-20-filled" tooltip-title="Export Fragments"
          tooltip-text="Export uploaded IFC files to Fragments, for faster future upload"></bim-button>
        <bim-button label="Export to CSV" @click="${exportFragscsv}" icon="fluent:document-pdf-20-filled" tooltip-title="Export Properties to CSV"
          tooltip-text="Exports all properties of the loaded IFC file to a CSV format."></bim-button>
      </bim-toolbar-section>
    `;
    });
};


