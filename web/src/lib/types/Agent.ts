export type Agent = {
    author: {
        github_id: string,
        id: string,
        name: string,
        source_url: string | null
    },
    chat_mode: {
        data_sources: string[],
        system_prompt: string,
        version: string
    },
    data_sources_indexed: boolean,
    description: string,
    metadata: {
        avatar_id: string,
        description: string,
        display_name: string,
        tags: string [],
        version: string,
    },
    data_sources: {
        id: string,
        uri: {
            type: string,
            uri: string
        }[]
    }[],
    min_cli_version: string,
    name: string,
    publisher_id: string,
    supported_commands: any,
    testing: boolean,
    version: string
}