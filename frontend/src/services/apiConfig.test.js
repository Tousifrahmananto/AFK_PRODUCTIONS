const originalURL = process.env.REACT_APP_API_URL;
afterEach(() => {
    if (originalURL === undefined) delete process.env.REACT_APP_API_URL;
    else process.env.REACT_APP_API_URL = originalURL;
});
test.each([undefined, "https://api.example.com", "https://api.example.com/api", "https://api.example.com/api/"])(
    "API and socket URLs agree for %s", (url) => {
        if (url === undefined) delete process.env.REACT_APP_API_URL;
        else process.env.REACT_APP_API_URL = url;
        jest.isolateModules(() => {
            const { API_BASE, API_ORIGIN } = require("./apiConfig");
            const origin = url ? "https://api.example.com" : "http://localhost:5000";
            expect(API_ORIGIN).toBe(origin);
            expect(API_BASE).toBe(`${origin}/api`);
        });
    }
);
