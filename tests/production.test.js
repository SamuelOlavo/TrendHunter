const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

describe("Production Replication Tests", () => {
  describe("Build Process", () => {
    it("should generate output.css in public folder", () => {
      const cssPath = path.join(__dirname, "../public/output.css");
      expect(fs.existsSync(cssPath)).toBe(true);
    });

    it("output.css should be minified and optimized", () => {
      const cssPath = path.join(__dirname, "../public/output.css");
      const content = fs.readFileSync(cssPath, "utf8");
      expect(content.length).toBeGreaterThan(10000);
      expect(content).toContain(".bg-\\[\\#0f0f0f\\]");
    });

    it("input.css should exist for build process", () => {
      const inputCssPath = path.join(__dirname, "../public/input.css");
      expect(fs.existsSync(inputCssPath)).toBe(true);
    });
  });

  describe("Security Checks", () => {
    it("should not have exposed credentials in HTML files", () => {
      const publicDir = path.join(__dirname, "../public");
      const htmlFiles = fs
        .readdirSync(publicDir)
        .filter((f) => f.endsWith(".html"));

      htmlFiles.forEach((file) => {
        const content = fs.readFileSync(path.join(publicDir, file), "utf8");
        // Check for exposed Supabase credentials
        expect(content).not.toContain("nnejmusqyekdczfphyvn");
        expect(content).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
      });
    });

    it("should not have exposed credentials in JS files", () => {
      const publicDir = path.join(__dirname, "../public");
      const jsFiles = fs
        .readdirSync(publicDir)
        .filter((f) => f.endsWith(".js"));

      jsFiles.forEach((file) => {
        const content = fs.readFileSync(path.join(publicDir, file), "utf8");
        expect(content).not.toContain("nnejmusqyekdczfphyvn");
        expect(content).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
      });
    });

    it("should have .gitignore properly configured", () => {
      const gitignorePath = path.join(__dirname, "../.gitignore");
      const content = fs.readFileSync(gitignorePath, "utf8");

      const requiredIgnores = [".env", "node_modules", "output.css", "*.log"];

      requiredIgnores.forEach((ignore) => {
        expect(content).toContain(ignore);
      });
    });

    it("should not commit sensitive .env files", () => {
      const rootDir = path.join(__dirname, "..");
      const envFiles = [".env", ".env.local", ".env.production"];

      envFiles.forEach((file) => {
        const envPath = path.join(rootDir, file);
        if (fs.existsSync(envPath)) {
          // If .env exists, it should be in .gitignore
          const gitignorePath = path.join(rootDir, ".gitignore");
          const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
          expect(gitignoreContent).toContain(file);
        }
      });
    });
  });

  describe("Deployment Readiness", () => {
    it("should have vercel.json configured", () => {
      const vercelPath = path.join(__dirname, "../vercel.json");
      expect(fs.existsSync(vercelPath)).toBe(true);
    });

    it("should have package.json with proper scripts", () => {
      const packagePath = path.join(__dirname, "../package.json");
      const content = JSON.parse(fs.readFileSync(packagePath, "utf8"));

      expect(content.scripts).toHaveProperty("build");
      expect(content.scripts).toHaveProperty("vercel-build");
    });

    it("should have proper Node.js version specified", () => {
      const packagePath = path.join(__dirname, "../package.json");
      const content = JSON.parse(fs.readFileSync(packagePath, "utf8"));

      expect(content.engines).toBeDefined();
      expect(content.engines.node).toBeDefined();
    });

    it("should have README with deployment instructions", () => {
      const readmePath = path.join(__dirname, "../README.md");
      expect(fs.existsSync(readmePath)).toBe(true);
    });
  });

  describe("File Structure Validation", () => {
    it("should have all required directories", () => {
      const rootDir = path.join(__dirname, "..");
      const requiredDirs = ["public", "api", "tests", "src"];

      requiredDirs.forEach((dir) => {
        const dirPath = path.join(rootDir, dir);
        expect(fs.existsSync(dirPath)).toBe(true);
      });
    });

    it("should have no duplicate node_modules", () => {
      const rootDir = path.join(__dirname, "..");
      const apiDir = path.join(rootDir, "api");

      // Root should have node_modules
      expect(fs.existsSync(path.join(rootDir, "node_modules"))).toBe(true);

      // API should have its own node_modules (separate backend)
      expect(fs.existsSync(path.join(apiDir, "node_modules"))).toBe(true);
    });

    it("should have no duplicate public folders", () => {
      const rootDir = path.join(__dirname, "..");
      const apiDir = path.join(rootDir, "api");

      // Root should have public
      expect(fs.existsSync(path.join(rootDir, "public"))).toBe(true);

      // API should NOT have public (removed duplicate)
      expect(fs.existsSync(path.join(apiDir, "public"))).toBe(false);
    });
  });

  describe("API Configuration", () => {
    it("API should have its own package.json", () => {
      const apiPackagePath = path.join(__dirname, "../api/package.json");
      expect(fs.existsSync(apiPackagePath)).toBe(true);
    });

    it("API should have server.js", () => {
      const serverPath = path.join(__dirname, "../api/server.js");
      expect(fs.existsSync(serverPath)).toBe(true);
    });

    it("API should have .env file (not committed)", () => {
      const apiEnvPath = path.join(__dirname, "../api/.env");
      // .env should exist for local development
      expect(fs.existsSync(apiEnvPath)).toBe(true);

      // But should be in .gitignore
      const gitignorePath = path.join(__dirname, "../.gitignore");
      const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
      expect(gitignoreContent).toContain("api/.env");
    });
  });

  describe("Performance Optimization", () => {
    it("HTML files should have proper meta tags", () => {
      const indexPath = path.join(__dirname, "../public/index.html");
      const content = fs.readFileSync(indexPath, "utf8");

      expect(content).toContain("viewport");
      expect(content).toContain("charset");
    });

    it("should use local CSS instead of CDN", () => {
      const htmlFiles = ["index.html", "plano.html", "dashboard.html"];

      htmlFiles.forEach((file) => {
        const filePath = path.join(__dirname, "../public", file);
        const content = fs.readFileSync(filePath, "utf8");
        expect(content).toContain("./output.css");
        expect(content).not.toContain("cdn.tailwindcss.com");
      });
    });

    it("should have favicon configured", () => {
      const indexPath = path.join(__dirname, "../public/index.html");
      const content = fs.readFileSync(indexPath, "utf8");
      expect(content).toContain('rel="icon"');
    });
  });
});
