from rest_framework.throttling import AnonRateThrottle

class RegisterThrottle(AnonRateThrottle):
    scope = 'register_limit'

class LoginThrottle(AnonRateThrottle):
    scope = 'login_limit'