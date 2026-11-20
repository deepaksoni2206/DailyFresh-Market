from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser  # (Yahan apne custom user model ka naam likhein)

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    # Agar aapke model me username nahi hai, toh 'email' ya jo bhi field ho wo use karein
    list_display = ('email', 'is_staff', 'is_active')  # 'username' hata diya
    search_fields = ('email',)                          # 'username' hata diya
    ordering = ('email',)                               # 'username' ki jagah 'email' kar diya
    
    # Agar AbstractUser use kiya hai aur password field edit karne me dikkat aaye:
    filter_horizontal = ('groups', 'user_permissions')