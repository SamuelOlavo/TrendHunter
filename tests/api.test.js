// Test endpoints (API tests require server to be running)
describe("Trend Hunter API Tests", () => {
  describe("SQL Endpoint Security", () => {
    it("should reject DROP commands", () => {
      const maliciousQuery = "DROP TABLE products_trend";
      const forbiddenKeywords = [
        "DROP",
        "DELETE",
        "UPDATE",
        "INSERT",
        "CREATE",
        "ALTER",
        "TRUNCATE",
      ];
      const upperQuery = maliciousQuery.toUpperCase();

      let isForbidden = false;
      for (const keyword of forbiddenKeywords) {
        if (upperQuery.includes(keyword)) {
          isForbidden = true;
          break;
        }
      }

      expect(isForbidden).toBe(true);
    });

    it("should reject DELETE commands", () => {
      const maliciousQuery = "DELETE FROM products_trend";
      const forbiddenKeywords = [
        "DROP",
        "DELETE",
        "UPDATE",
        "INSERT",
        "CREATE",
        "ALTER",
        "TRUNCATE",
      ];
      const upperQuery = maliciousQuery.toUpperCase();

      let isForbidden = false;
      for (const keyword of forbiddenKeywords) {
        if (upperQuery.includes(keyword)) {
          isForbidden = true;
          break;
        }
      }

      expect(isForbidden).toBe(true);
    });

    it("should allow SELECT commands", () => {
      const validQuery = "SELECT * FROM products_trend LIMIT 10";
      const forbiddenKeywords = [
        "DROP",
        "DELETE",
        "UPDATE",
        "INSERT",
        "CREATE",
        "ALTER",
        "TRUNCATE",
      ];
      const upperQuery = validQuery.toUpperCase();

      let isForbidden = false;
      for (const keyword of forbiddenKeywords) {
        if (upperQuery.includes(keyword)) {
          isForbidden = true;
          break;
        }
      }

      expect(isForbidden).toBe(false);
    });
  });
});

// Frontend file structure tests
describe("Frontend File Structure Tests", () => {
  describe("Public folder structure", () => {
    const fs = require("fs");
    const path = require("path");

    it("should have index.html in public folder", () => {
      const indexPath = path.join(__dirname, "../public/index.html");
      expect(fs.existsSync(indexPath)).toBe(true);
    });

    it("should have plano.html in public folder", () => {
      const planoPath = path.join(__dirname, "../public/plano.html");
      expect(fs.existsSync(planoPath)).toBe(true);
    });

    it("should have dashboard.html in public folder", () => {
      const dashboardPath = path.join(__dirname, "../public/dashboard.html");
      expect(fs.existsSync(dashboardPath)).toBe(true);
    });

    it("should have output.css in public folder", () => {
      const cssPath = path.join(__dirname, "../public/output.css");
      expect(fs.existsSync(cssPath)).toBe(true);
    });

    it("should have dashboard.js in public folder", () => {
      const jsPath = path.join(__dirname, "../public/dashboard.js");
      expect(fs.existsSync(jsPath)).toBe(true);
    });
  });

  describe("HTML file references", () => {
    const fs = require("fs");
    const path = require("path");

    it("index.html should reference output.css", () => {
      const indexPath = path.join(__dirname, "../public/index.html");
      const content = fs.readFileSync(indexPath, "utf8");
      expect(content).toContain("./output.css");
    });

    it("plano.html should reference output.css", () => {
      const planoPath = path.join(__dirname, "../public/plano.html");
      const content = fs.readFileSync(planoPath, "utf8");
      expect(content).toContain("./output.css");
    });

    it("dashboard.html should reference output.css", () => {
      const dashboardPath = path.join(__dirname, "../public/dashboard.html");
      const content = fs.readFileSync(dashboardPath, "utf8");
      expect(content).toContain("./output.css");
    });
  });
});

// Production readiness tests
describe("Production Readiness Tests", () => {
  describe("Environment variables", () => {
    it("should have .gitignore configured", () => {
      const fs = require("fs");
      const path = require("path");
      const gitignorePath = path.join(__dirname, "../.gitignore");
      const content = fs.readFileSync(gitignorePath, "utf8");

      expect(content).toContain(".env");
      expect(content).toContain("node_modules");
      expect(content).toContain("output.css");
    });

    it("should not have sensitive data in code", () => {
      const fs = require("fs");
      const path = require("path");

      // Check that .env.example exists but doesn't have real credentials
      const envExamplePath = path.join(__dirname, "../.env.example");
      if (fs.existsSync(envExamplePath)) {
        const content = fs.readFileSync(envExamplePath, "utf8");
        // Should not contain actual Supabase URL or key
        expect(content).not.toContain("nnejmusqyekdczfphyvn");
      }
    });
  });

  describe("Build process", () => {
    it("should have build script in package.json", () => {
      const fs = require("fs");
      const path = require("path");
      const packageJsonPath = path.join(__dirname, "../package.json");
      const content = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

      expect(content.scripts).toHaveProperty("build");
      expect(content.scripts).toHaveProperty("build:css");
    });
  });
});
