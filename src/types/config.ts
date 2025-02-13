export interface Config {
    rpc: {
        endpoint: string;
    };
    server: {
        port: number;
    };
    scraper: {
        interval: string;
    };
} 