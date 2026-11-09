<!-- suite
id: @S12345678
-->

# Login Functionality

Tests for the login process.

<!-- test
priority: normal
-->

# User can log in with valid credentials @smoke

Valid users reach the dashboard.

## Steps

- Open the login page
  *Expected*: Login form is displayed
- Enter credentials and submit
  *Expected*: User is redirected to the dashboard

<!-- example -->

| Username | Password |
| --- | --- |
| admin | admin123 |

<!-- test
priority: high
-->

# User cannot log in with invalid password

## Steps

1. Open the login page
2. Submit a wrong password
   *Expected*: Error message is shown
