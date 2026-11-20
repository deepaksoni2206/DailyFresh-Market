from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from account.serailizers import RegisterSerializer
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from account.throttle import RegisterThrottle, LoginThrottle
from .models import Profile
from account.serailizers import ProfileSerializer

# Create your views here.

class RegisterAPIView(APIView):
    throttle_classes = [RegisterThrottle]  # Yeh limit sirf Register par chalegi

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {'message': 'User registered successfully!'}, 
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors)



class LoginAPIView(APIView):

    throttle_classes = [LoginThrottle]  # Yeh limit sirf Login par chalegi

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {'error': 'Please provide both email and password'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, username =email, password=password)
        # authenticate() function apne aap password ko decrypt/verify karke check karta hai ki user ka dala hua password sahi hai ya nahi.

#         1. authenticate() kya return karta hai?
# Jab aap authenticate(request, username=email, password=password) chalate hain, toh:

# Agar email aur password bilkul sahi hain: Toh yeh function database se us user ka poora object (jaise user ki ID, email, name) return kar deta hai (user is not None ho jata hai).

# Agar email galat hai YA password galat hai: Toh authenticate() kuch bhi nahi dhoond pata aur None return kar deta hai.

        if user is not None:

            refresh = RefreshToken.for_user(user)

            return Response({
                'message': 'Login successful',
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name
            }, status=status.HTTP_200_OK)
        
        return Response(
            {'error': 'Invalid email or password'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )

class Logout(APIView):
    def post(self, request):
        refresh_token = request.data.get('refresh')

        if not refresh_token:
            return Response(
                {'error': 'Refresh token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response(
                {'error': 'Invalid or expired refresh token'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {'message': 'Successfully logged out!'},
            status=status.HTTP_200_OK
        )
from rest_framework.permissions import IsAuthenticated

class ProfileViews(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile , _  = Profile.objects.get_or_create(user = request.user)
        serializer = ProfileSerializer(profile)
        return Response({'Message': 'User Profile Fetched Successfully','data': serializer.data},
                        status=status.HTTP_200_OK)

    def patch(self, request):
        profile , _ = Profile.objects.get_or_create(user= request.user)
        serializer = ProfileSerializer(profile, data= request.data, partial = True)
        if serializer.is_valid(raise_exception= True):
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
