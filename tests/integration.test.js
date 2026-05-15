const fs = require('fs');
const path = require('path');

describe('Integration Tests - Modified File Calls', () => {
  
  describe('HTML File Link Validation', () => {
    it('index.html should have valid link to plano.html', () => {
      const indexPath = path.join(__dirname, '../public/index.html');
      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toContain('href="plano.html"');
    });

    it('index.html should have valid link to dashboard.html', () => {
      const indexPath = path.join(__dirname, '../public/index.html');
      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toContain('href="dashboard.html"');
    });

    it('plano.html should have valid link to index.html', () => {
      const planoPath = path.join(__dirname, '../public/plano.html');
      const content = fs.readFileSync(planoPath, 'utf8');
      expect(content).toContain('href="index.html"');
    });

    it('dashboard.html should reference dashboard.js', () => {
      const dashboardPath = path.join(__dirname, '../public/dashboard.html');
      const content = fs.readFileSync(dashboardPath, 'utf8');
      expect(content).toContain('src="dashboard.js"');
    });

    it('dashboard.html should reference dashboard.css', () => {
      const dashboardPath = path.join(__dirname, '../public/dashboard.html');
      const content = fs.readFileSync(dashboardPath, 'utf8');
      expect(content).toContain('href="dashboard.css"');
    });
  });

  describe('CSS File Validation', () => {
    it('output.css should exist and be non-empty', () => {
      const cssPath = path.join(__dirname, '../public/output.css');
      expect(fs.existsSync(cssPath)).toBe(true);
      const content = fs.readFileSync(cssPath, 'utf8');
      expect(content.length).toBeGreaterThan(100);
    });

    it('output.css should contain Tailwind classes', () => {
      const cssPath = path.join(__dirname, '../public/output.css');
      const content = fs.readFileSync(cssPath, 'utf8');
      expect(content).toContain('.bg-\\[\\#0f0f0f\\]');
    });

    it('dashboard.css should exist', () => {
      const cssPath = path.join(__dirname, '../public/dashboard.css');
      expect(fs.existsSync(cssPath)).toBe(true);
    });
  });

  describe('JavaScript File Validation', () => {
    it('dashboard.js should exist and be non-empty', () => {
      const jsPath = path.join(__dirname, '../public/dashboard.js');
      expect(fs.existsSync(jsPath)).toBe(true);
      const content = fs.readFileSync(jsPath, 'utf8');
      expect(content.length).toBeGreaterThan(100);
    });

    it('dashboard.js should contain Chart.js references', () => {
      const jsPath = path.join(__dirname, '../public/dashboard.js');
      const content = fs.readFileSync(jsPath, 'utf8');
      expect(content).toContain('Chart');
    });
  });

  describe('Mobile Menu Functionality', () => {
    it('index.html should have mobile menu button', () => {
      const indexPath = path.join(__dirname, '../public/index.html');
      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toContain('id="mobileMenuBtn"');
    });

    it('plano.html should have mobile menu button', () => {
      const planoPath = path.join(__dirname, '../public/plano.html');
      const content = fs.readFileSync(planoPath, 'utf8');
      expect(content).toContain('id="mobileMenuBtn"');
    });

    it('index.html should have mobile menu script', () => {
      const indexPath = path.join(__dirname, '../public/index.html');
      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toContain('mobileMenuBtn.addEventListener');
    });
  });

  describe('Form Validation', () => {
    it('index.html should have Netlify form', () => {
      const indexPath = path.join(__dirname, '../public/index.html');
      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toContain('data-netlify="true"');
    });

    it('index.html should have email input', () => {
      const indexPath = path.join(__dirname, '../public/index.html');
      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toContain('type="email"');
    });
  });

  describe('WhatsApp Link Validation', () => {
    it('plano.html should have WhatsApp link', () => {
      const planoPath = path.join(__dirname, '../public/plano.html');
      const content = fs.readFileSync(planoPath, 'utf8');
      expect(content).toContain('wa.me');
    });

    it('WhatsApp link should have correct phone number', () => {
      const planoPath = path.join(__dirname, '../public/plano.html');
      const content = fs.readFileSync(planoPath, 'utf8');
      expect(content).toContain('5531993101769');
    });
  });
});
