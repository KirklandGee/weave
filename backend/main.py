from backend.services.neo4j import verify, query



def main():
    print(verify())
    nodes = query(
            """
        MATCH (c:Campaign {title: $title})<-[:PART_OF]-(n)
        RETURN n
        """,
            title="Faerûn in Crisis",
            database_="neo4j",
        )

    for n in nodes:
        node = n['n']
        print(node['id'])
        print(node['title'])
        print(node['markdown'])


if __name__ == "__main__":
    main()
