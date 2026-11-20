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
  
class FullAddress(models.Model):
    ADDRESS_TYPE_CHOICES = [
        ("home", "Home"),
        ("work", "Work"),
        ("other", "Other"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="addresses",
    )
    label = models.CharField(
        max_length=20,
        choices=ADDRESS_TYPE_CHOICES,
        default="home",
    )

    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=15)
    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100, default="India")
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_default", "-updated_at"]

    def save(self, *args, **kwargs):
        # Agar is address ko default mark kiya gaya hai, toh baaki addresses ka is_default False kar do
        if self.is_default:
            FullAddress.objects.filter(user=self.user, is_default=True).exclude(
                pk=self.pk
            ).update(is_default=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.label}) - {self.city}"

      

    



