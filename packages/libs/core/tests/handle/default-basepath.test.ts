import { PrerenderManifest } from "next/dist/build";
import {
  Event,
  handleDefault,
  PageManifest,
  prepareBuildManifests,
  RoutesManifest
} from "../../src";

const event = (url: string): Event => {
  return {
    req: {
      headers: [],
      url
    } as any,
    res: {
      end: jest.fn(),
      setHeader: jest.fn()
    } as any,
    responsePromise: new Promise(() => ({}))
  };
};

describe("Default handler (basepath)", () => {
  let pagesManifest: { [key: string]: string };
  let manifest: PageManifest;
  let prerenderManifest: PrerenderManifest;
  let routesManifest: RoutesManifest;
  let getPage: any;

  beforeAll(async () => {
    prerenderManifest = {
      version: 3,
      notFoundRoutes: [],
      routes: {
        "/ssg": {
          initialRevalidateSeconds: false,
          srcRoute: null,
          dataRoute: "unused"
        },
        "/fallback/prerendered": {
          initialRevalidateSeconds: false,
          srcRoute: null,
          dataRoute: "unused"
        }
      },
      dynamicRoutes: {
        "/fallback/[slug]": {
          routeRegex: "unused",
          dataRoute: "unused",
          dataRouteRegex: "unused",
          fallback: "/fallback/[slug].html"
        }
      },
      preview: {
        previewModeId: "test-id",
        previewModeEncryptionKey: "test-key",
        previewModeSigningKey: "test-sig-key"
      }
    };
    routesManifest = {
      basePath: "/base",
      headers: [],
      redirects: [
        {
          source: "/base/redirect-simple",
          destination: "/base/redirect-target",
          statusCode: 307
        },
        {
          source: "/base/redirect/:dynamic",
          destination: "/base/redirect-target/:dynamic",
          statusCode: 308
        }
      ],
      rewrites: []
    };
    pagesManifest = {
      "/": "pages/index.html",
      "/404": "pages/404.html",
      "/500": "pages/500.html",
      "/[root]": "pages/[root].html",
      "/html/[page]": "pages/html/[page].html",
      "/ssr": "pages/ssr.js",
      "/ssr/[id]": "pages/ssr/[id].js",
      "/ssg": "pages/ssg.js",
      "/fallback/[slug]": "pages/fallback/[slug].js"
    };
    const buildId = "test-build-id";
    const publicFiles = ["favicon.ico", "name with spaces.txt"];
    const manifests = await prepareBuildManifests(
      { buildId, domainRedirects: {} },
      {},
      routesManifest,
      pagesManifest,
      prerenderManifest,
      publicFiles
    );
    manifest = manifests.pageManifest;
  });

  beforeEach(() => {
    jest.spyOn(console, "error").mockReturnValueOnce();
    getPage = jest.fn();
  });

  describe("Public file", () => {
    it.each`
      uri                                 | file
      ${"/base/favicon.ico"}              | ${"/favicon.ico"}
      ${"/base/name%20with%20spaces.txt"} | ${"/name%20with%20spaces.txt"}
    `("Routes $uri to public file", async ({ file, uri }) => {
      const route = await handleDefault(
        event(uri),
        manifest,
        prerenderManifest,
        routesManifest,
        getPage
      );

      expect(route).toBeTruthy();
      if (route) {
        expect(route.isPublicFile).toBeTruthy();
        expect(route.file).toEqual(file);
      }
    });
  });

  describe("Non-dynamic", () => {
    it.each`
      uri                  | file
      ${"/base"}           | ${"pages/index.html"}
      ${"/base/ssg"}       | ${"pages/ssg.html"}
      ${"/base/not/found"} | ${"pages/404.html"}
      ${"/ssg"}            | ${"pages/404.html"}
    `("Routes static page $uri to file $file", async ({ uri, file }) => {
      const route = await handleDefault(
        event(uri),
        manifest,
        prerenderManifest,
        routesManifest,
        getPage
      );

      expect(route).toBeTruthy();
      if (route) {
        expect(route.isStatic).toBeTruthy();
        expect(route.file).toEqual(file);
      }
    });

    it.each`
      uri                                          | file
      ${"/base/_next/data/test-build-id/ssg.json"} | ${"/_next/data/test-build-id/ssg.json"}
    `("Routes static data route $uri to file $file", async ({ uri, file }) => {
      const route = await handleDefault(
        event(uri),
        manifest,
        prerenderManifest,
        routesManifest,
        getPage
      );

      expect(route).toBeTruthy();
      if (route) {
        expect(route.isStatic).toBeTruthy();
        expect(route.file).toEqual(file);
      }
    });

    it.each`
      uri                                          | page
      ${"/base/ssr"}                               | ${"pages/ssr.js"}
      ${"/base/_next/data/test-build-id/ssr.json"} | ${"pages/ssr.js"}
    `("Routes SSR request $uri to page $page", async ({ uri, page }) => {
      const route = await handleDefault(
        event(uri),
        manifest,
        prerenderManifest,
        routesManifest,
        getPage
      );

      expect(getPage).toHaveBeenCalledWith(page);

      // mocked getPage throws an error in render, so error page returned
      expect(route).toBeTruthy();
      if (route) {
        expect(route.isStatic).toBeTruthy();
        expect(route.file).toEqual("pages/500.html");
      }
    });
  });

  describe("Dynamic", () => {
    it.each`
      uri                     | file
      ${"/base/foo"}          | ${"pages/[root].html"}
      ${"/base/html/bar"}     | ${"pages/html/[page].html"}
      ${"/base/fallback/new"} | ${"pages/fallback/new.html"}
    `("Routes static page $uri to file $file", async ({ uri, file }) => {
      const route = await handleDefault(
        event(uri),
        manifest,
        prerenderManifest,
        routesManifest,
        getPage
      );

      expect(route).toBeTruthy();
      if (route) {
        expect(route.isStatic).toBeTruthy();
        expect(route.file).toEqual(file);
      }
    });

    it.each`
      uri                                                   | file
      ${"/base/_next/data/test-build-id/fallback/new.json"} | ${"/_next/data/test-build-id/fallback/new.json"}
    `("Routes static data route $uri to file $file", async ({ uri, file }) => {
      const route = await handleDefault(
        event(uri),
        manifest,
        prerenderManifest,
        routesManifest,
        getPage
      );

      expect(route).toBeTruthy();
      if (route) {
        expect(route.isStatic).toBeTruthy();
        expect(route.file).toEqual(file);
      }
    });

    it.each`
      uri                                            | page
      ${"/base/ssr/1"}                               | ${"pages/ssr/[id].js"}
      ${"/base/_next/data/test-build-id/ssr/1.json"} | ${"pages/ssr/[id].js"}
    `("Routes SSR request $uri to page $page", async ({ uri, page }) => {
      const route = await handleDefault(
        event(uri),
        manifest,
        prerenderManifest,
        routesManifest,
        getPage
      );

      expect(getPage).toHaveBeenCalledWith(page);

      // mocked getPage throws an error in render, so error page returned
      expect(route).toBeTruthy();
      if (route) {
        expect(route.isStatic).toBeTruthy();
        expect(route.file).toEqual("pages/500.html");
      }
    });
  });

  describe("Redirect", () => {
    it.each`
      uri                        | code   | destination
      ${"/base/ssg/"}            | ${308} | ${"/base/ssg"}
      ${"/base/favicon.ico/"}    | ${308} | ${"/base/favicon.ico"}
      ${"/base/redirect-simple"} | ${307} | ${"/base/redirect-target"}
      ${"/base/redirect/test"}   | ${308} | ${"/base/redirect-target/test"}
    `(
      "Redirects $uri to $destination with code $code",
      async ({ code, destination, uri }) => {
        const e = event(uri);
        const route = await handleDefault(
          e,
          manifest,
          prerenderManifest,
          routesManifest,
          getPage
        );

        expect(route).toBeFalsy();
        expect(e.res.statusCode).toEqual(code);
        expect(e.res.setHeader).toHaveBeenCalledWith("Location", destination);
        expect(e.res.end).toHaveBeenCalled();
      }
    );
  });
});
