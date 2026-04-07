import json
import random

# Extended Sri Lankan Data Sets
FIRST_NAMES = ["Madushan", "Sujith", "Kusal", "Pathum",
               "Chamari", "Nilakshi", "Ishara", "Tharindu", "Dilshan", "Anura"]
SURNAMES = ["Silva", "Perera", "Fernando", "Karunaratne",
            "Rajapaksa", "Gunawardena", "Amarasinghe", "Wickramasinghe"]
INITIALS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

PLACE_TYPES = [
    "Police Station", "Railway Station", "Base Hospital", "National School",
    "Municipal Council", "Post Office", "District Secretariat", "Public Library",
    "Bus Stand", "Zonal Education Office", "General Hospital"
]

STREET_NAMES = ["Galle Road", "Kandy Road", "Main Street",
                "Temple Road", "Station Road", "Flower Road"]


def generate_sri_lankan_name():
    """Generates names like D.P. Madushan or J.M. Sujith Karunaratne"""
    # Randomly pick 1 or 2 initials
    init_str = ".".join(random.sample(INITIALS, random.randint(1, 2))) + "."

    structure = random.choice(["initials_first", "initials_surname"])

    if structure == "initials_first":
        # Format: D.P. Madushan
        return f"{init_str} {random.choice(FIRST_NAMES)}"
    else:
        # Format: J.M. Sujith Karunaratne
        return f"{init_str} {random.choice(FIRST_NAMES)} {random.choice(SURNAMES)}"


def generate_mock_data(input_file, output_file):
    try:
        with open(input_file, 'r') as json_file:
            data = json.load(json_file)
            nodes = data.get('nodes', [])
    except FileNotFoundError:
        print("Error: map_data.json not found.")
        return

    locations = []

    for city in nodes:
        city_name = city['name']

        for _ in range(random.randint(5, 10)):
            is_person = random.choice([True, False])

            if is_person:
                name = generate_sri_lankan_name()
                # 7XXXXXXXX (9 digits)
                phone = f"7{random.randint(10000000, 99999999)}"
            else:
                # Format: Colombo Police Station
                name = f"{city_name} {random.choice(PLACE_TYPES)}"
                # 11XXXXXXX (9 digits)
                phone = f"11{random.randint(1000000, 9999999)}"

            # Address with city name at the end
            address = f"No {random.randint(1, 500)}, {random.choice(STREET_NAMES)}, {city_name}"

            locations.append({
                "name": name,
                "city": city_name,
                "address": address,
                "phone": phone,
                "category": "Person" if is_person else "Infrastructure"
            })

    with open(output_file, 'w') as out_file:
        json.dump(locations, out_file, indent=4)

    print(f"Generated {len(locations)} records in {output_file}")


generate_mock_data('map_data.json', 'location_map_data.json')
