from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


# 1. Custom Manager banana zaroori hai
class CustomUserManager(BaseUserManager):

  def create_user(self, email, password=None, **extra_fields):
    if not email:
      raise ValueError("Email dena zaroori hai!")
    email = self.normalize_email(email)
    user = self.model(email=email, **extra_fields)
    user.set_password(password)
    user.save(using=self._db)
    return user

  def create_superuser(self, email, password=None, **extra_fields):
    extra_fields.setdefault("is_staff", True)
    extra_fields.setdefault("is_superuser", True)
    extra_fields.setdefault("is_active", True)

    if extra_fields.get("is_staff") is not True:
      raise ValueError("Superuser ke liye is_staff=True hona chahiye.")
    if extra_fields.get("is_superuser") is not True:
      raise ValueError("Superuser ke liye is_superuser=True hona chahiye.")

    return self.create_user(email, password, **extra_fields)


# 2. Custom User Model
class CustomUser(AbstractUser):
  username = None  # Username hata diya
  email = models.EmailField(unique=True)  # Email ko unique banaya

  USERNAME_FIELD = 'email'  # Login email se hoga
  REQUIRED_FIELDS = []  # Superuser banate waqt sirf email aur password pucha jayega

  # Manager ko yahan connect karna mat bhoolna!
  objects = CustomUserManager()

  def __str__(self):
    return self.email

from django.conf import settings

class Profile(models.Model):
  user = models.OneToOneField(settings.AUTH_USER_MODEL , on_delete=models.CASCADE, related_name= 'profile')
  phone = models.CharField(max_length=15, null= True, blank= True)
  city = models.CharField(max_length=100, null= True, blank=True)
  updated_at = models.DateTimeField(auto_now=True)

  def __str__(self):
    return f"{self.user} - Profile"
  
