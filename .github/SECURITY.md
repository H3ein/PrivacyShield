# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 3.1.x   | :white_check_mark: |
| 3.0.x   | :white_check_mark: |
| < 3.0   | :x:                |

## Reporting a Vulnerability

We take security seriously at PrivacyShield. If you discover a security vulnerability, please report it responsibly.

### How to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead:

1. **Email**: Send details to the repository owner via GitHub
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: 1-3 days
  - High: 1-2 weeks
  - Medium: 2-4 weeks
  - Low: Best effort

### Security Scope

#### In Scope
- Cross-site scripting (XSS)
- Code injection
- Authentication/authorization issues
- Data leakage
- Privacy violations
- Manifest permission issues
- Content Security Policy bypasses

#### Out of Scope
- Social engineering
- Physical attacks
- Denial of service
- Issues requiring physical access to device
- Theoretical vulnerabilities without proof of concept

## Security Measures

PrivacyShield implements multiple security layers:

### Code Security
- No `eval()` or dynamic code execution
- Strict Content Security Policy
- Input validation and sanitization
- No inline scripts
- Secure storage practices

### Privacy Protection
- Zero telemetry
- No external network requests
- Local-only storage
- Minimal permissions
- Open source transparency

### Development Security
- ESLint security rules
- Automated testing
- Code review process
- Dependency auditing
- Regular security updates

## Best Practices for Contributors

When contributing code:

1. **Validate all inputs** - Never trust user data
2. **Sanitize outputs** - Prevent XSS attacks
3. **Use parameterized queries** - Prevent injection attacks
4. **Follow CSP** - No inline scripts or eval()
5. **Minimize permissions** - Request only what's needed
6. **Review dependencies** - Audit third-party code
7. **Handle errors safely** - Don't expose sensitive info
8. **Test security** - Include security test cases

## Security Updates

Security patches are released as soon as possible after verification. Users should:

- Keep PrivacyShield updated to the latest version
- Monitor release notes for security fixes
- Report suspicious behavior immediately

## Contact

For security concerns, contact the maintainers through:
- GitHub Issues (for non-sensitive security discussions)
- Private message to repository owner (for vulnerabilities)

## Acknowledgments

We appreciate responsible disclosure and will credit security researchers who report vulnerabilities (with their permission).

---

**Thank you for helping keep PrivacyShield secure!**
