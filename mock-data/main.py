import xml.etree.ElementTree as ET
import json


def generate_dijkstra_json(input_file, output_file):
    # Parse the XML tree
    tree = ET.parse(input_file)
    root = tree.getroot()

    nodes_list = []
    edges_list = []

    # 1. Process Nodes
    for node in root.iter('node'):
        node_id = node.get('id')
        # Float conversion preserves exact precision
        x_val = float(node.get('positionX'))
        y_val = float(node.get('positionY'))

        # Check if this is the Electricity Board (Node 66)
        if node_id == "66":
            formatted_id = f"eb_{node_id}"
            node_type = "ELECTRICITY_BOARD"
            name = "Regional Electricity Board"
        else:
            formatted_id = f"node_{node_id}"
            node_type = "PLACE"
            name = ""  # Left empty for you to fill later

        nodes_list.append({
            "id": formatted_id,
            "name": name,
            "type": node_type,
            "x": x_val,
            "y": y_val
        })

    # 2. Process Edges
    for edge in root.iter('edge'):
        source_id = edge.get('source')
        target_id = edge.get('target')
        weight_val = float(edge.get('weight'))

        # We need to map the raw source/target IDs to our new formatted IDs
        formatted_source = f"eb_{source_id}" if source_id == "66" else f"node_{source_id}"
        formatted_target = f"eb_{target_id}" if target_id == "66" else f"node_{target_id}"

        edges_list.append({
            "source": formatted_source,
            "target": formatted_target,
            "weight": weight_val
        })

    # 3. Construct the Final JSON Object
    final_data = {
        "metadata": {
            "district": "Nebula Heights",
            "node_count": len(nodes_list),
            "edge_count": len(edges_list)
        },
        "nodes": nodes_list,
        "edges": edges_list
    }

    # 4. Save to File
    with open(output_file, 'w', encoding='utf-8') as json_file:
        # indent=2 keeps it readable so you can manually add your city names later
        json.dump(final_data, json_file, indent=2)

    print(f"✅ Conversion complete!")
    print(f"Processed {len(nodes_list)} nodes and {len(edges_list)} edges.")
    print(f"Data saved to {output_file}")


# Run the function
if __name__ == "__main__":
    generate_dijkstra_json('graphdata.graphml', 'map_data.json')
