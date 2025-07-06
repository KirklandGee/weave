from db.db_test import test_connection
from services.neo4j_service import get_campaign_nodes


def main():
    print("Hello from backend!")
    print(test_connection())
    print(get_campaign_nodes('Faerûn in Crisis'))


if __name__ == "__main__":
    main()
