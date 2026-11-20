from django.contrib import admin
from django.urls import path
from account.views import RegisterAPIView,LoginAPIView, Logout, ProfileViews, FullAddressView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)




urlpatterns = [
    path('admin/', admin.site.urls),
    path('register/', RegisterAPIView.as_view()),
    path('api/login/', LoginAPIView.as_view(), name='login'),  # <-- Yeh rahi aapki custom login API
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', Logout.as_view(), name='logout'),
    path("api/profile/", ProfileViews.as_view(), name="profile"),
    path('api/address-list/', FullAddressView.as_view(), name= "address-list"),

    # path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    # path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
