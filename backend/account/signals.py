from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from account.models import Profile


User = settings.AUTH_USER_MODEL

@receiver(post_save, sender=User)
def create_or_save_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.get_or_create(user=instance)
