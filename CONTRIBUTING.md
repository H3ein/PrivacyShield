# 🤝 Contributing to PrivacyShield

Thank you for your interest in contributing to PrivacyShield! This document provides guidelines and information for contributors.

## 🎯 Our Mission

PrivacyShield is a **brutalist minimal** privacy protection extension. We believe in:
- **Function over form** - No decorative elements
- **Privacy first** - Zero telemetry, local storage only
- **Performance** - Lightweight and fast
- **Security** - Comprehensive input validation and safe practices

## 🚀 Getting Started

### Prerequisites
- **Node.js** 16+ 
- **Chrome** 88+ (for testing)
- **Git** for version control

### Setup Development Environment
```bash
# Fork and clone the repository
git clone https://github.com/yourusername/privacyshield.git
cd privacyshield

# Install dependencies
npm install

# Run tests to verify setup
npm test

# Start development
npm run dev
```

### Load Extension in Chrome
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `privacyshield` folder

## 📋 How to Contribute

### 1. Report Bugs 🐛
- Use [GitHub Issues](https://github.com/yourusername/privacyshield/issues)
- Include:
  - Chrome version
  - PrivacyShield version
  - Steps to reproduce
  - Expected vs actual behavior
  - Screenshots if applicable

### 2. Suggest Features 💡
- Open an issue with `Feature Request` label
- Describe the problem you're solving
- Explain why it aligns with our brutalist philosophy
- Consider performance and security implications

### 3. Submit Code Changes 📝

#### Workflow
1. **Create an issue** (if one doesn't exist)
2. **Fork** the repository
3. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes**
5. **Test thoroughly**:
   ```bash
   npm test
   npm run lint
   npm run build
   ```
6. **Commit** with clear messages:
   ```bash
   git commit -m "feat: add custom rule builder"
   ```
7. **Push** to your fork
8. **Create a Pull Request**

#### Commit Message Guidelines
Use [Conventional Commits](https://www.conventionalcommits.org/) format:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:
```
feat: add custom rule builder
fix: resolve memory leak in stats module
docs: update installation instructions
```

## 🏗️ Code Style & Standards

### JavaScript Standards
- **ES6+** modules and syntax
- **No eval()** or dynamic code execution
- **Comprehensive input validation**
- **Error handling** with try-catch blocks
- **JSDoc** comments for all functions

### Brutalist Design Principles
- **Minimal UI** - No decorative elements
- **High contrast** - Black/white color scheme
- **Monospace fonts** - Technical feel
- **Sharp edges** - No rounded corners
- **Binary states** - Clear on/off behaviors

### Performance Requirements
- **Memory usage** < 10MB
- **Initialization** < 100ms
- **CPU impact** < 1%
- **Package size** < 100KB

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Requirements
- **Unit tests** for all modules
- **Integration tests** for key workflows
- **Manual testing** in Chrome
- **Performance testing** for memory/CPU

### Test Structure
```
tests/
├── unit/           # Unit tests for individual modules
├── integration/    # Integration tests for workflows
├── e2e/          # End-to-end tests
└── fixtures/      # Test data and mocks
```

## 🔒 Security Guidelines

### Must Follow
- **Input validation** for all user inputs
- **No eval()** or Function constructor
- **CSP compliance** - no inline scripts
- **Safe storage** - sanitize before storing
- **Error logging** without exposing sensitive data

### Security Review
All changes undergo security review:
1. **Automated scanning** (ESLint security rules)
2. **Manual code review**
3. **Testing** for edge cases
4. **Documentation** of security considerations

## 📁 Project Structure

```
privacyshield/
├── 📄 manifest.json         # Extension manifest
├── 🔄 background.js         # Service worker
├── 🌐 content.js            # Content script
├── 📁 src/                  # Source code
│   ├── 🔧 core/             # Core functionality
│   ├── 🛡️ privacy/          # Privacy features
│   ├── 🎨 ui/               # User interface
│   └── 🤖 ai/               # AI features (disabled)
├── 🎨 ui/                   # UI files
├── 📋 rules/                # Blocking rules
├── 🖼️ icons/               # Extension icons
├── 🧪 tests/                # Test files
└── 📚 docs/                 # Documentation
```

## 🎯 Areas of Contribution

### High Priority
- **🐛 Bug fixes** and stability improvements
- **📋 New blocking patterns** (ads, trackers)
- **🔒 Security enhancements**
- **⚡ Performance optimizations**

### Medium Priority
- **🎨 UI improvements** (maintaining brutalist style)
- **📊 Enhanced statistics**
- **🧪 Test coverage**
- **📚 Documentation**

### Low Priority
- **🌐 Browser compatibility** (Firefox, Safari)
- **🤖 AI features** (if security approved)
- **📈 Advanced analytics**
- **🎨 Themes** (if they align with brutalist philosophy)

## 📝 Documentation

### Types
- **README.md** - Main project documentation
- **CONTRIBUTING.md** - Contributor guidelines
- **API.md** - Technical API documentation
- **DESIGN.md** - Design decisions and philosophy

### Writing Guidelines
- **Clear and concise** language
- **Code examples** for technical concepts
- **Screenshots** for UI changes
- **Step-by-step** instructions

## 🚀 Release Process

### Version Bumping
- **Patch** (0.0.1): Bug fixes
- **Minor** (0.1.0): New features
- **Major** (1.0.0): Breaking changes

### Release Checklist
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Security review completed
- [ ] Performance tested
- [ ] Manual testing in Chrome

## 🏆 Recognition

### Contributors
- **GitHub Contributors** section in README
- **Release notes** mention significant contributions
- **Special thanks** in major releases

### Types of Contributions
- **Code** - Features, bug fixes, tests
- **Documentation** - Guides, API docs
- **Design** - UI/UX improvements
- **Community** - Support, issue triage
- **Security** - Vulnerability reports, fixes

## 📞 Getting Help

### Resources
- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General questions and ideas
- **Documentation** - Technical guides and API reference
- **Wiki** - Community-contributed content

### Contact
- **Maintainers**: @yourusername
- **Email**: privacyshield@example.com
- **Discord**: [Community Server](https://discord.gg/privacyshield)

## 📄 License

By contributing to PrivacyShield, you agree that your contributions will be licensed under the **MIT License**.

---

## 🙏 Thank You!

PrivacyShield exists because of contributors like you. Whether you're:
- 🐛 Reporting bugs
- 💡 Suggesting features  
- 📝 Writing code
- 📚 Improving documentation
- 🤝 Helping other users

**Your contributions make privacy protection accessible to everyone.**

---

**🛡️ PrivacyShield - Brutalist Privacy Protection**

*Protect your privacy, brutally simple.*
