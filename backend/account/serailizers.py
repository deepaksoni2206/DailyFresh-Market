
from rest_framework import serializers
from django.contrib.auth import get_user_model
User = get_user_model()
from account.models import Profile

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only = True)
    confirm_password = serializers.CharField(write_only = True) # extra field
    # write_only=True ka matlab: Iska matlab hai ki yeh field sirf likhne (input lene) ke liye hai, padhne (response dene) ke liye nahi.
    class Meta:
        model = User
        fields = ['email', 'password', 'confirm_password', 'first_name', 'last_name']

    # def validated_data(self, value):
    #     if User.objects.filter(username =value).exists():
    #         return serializers.ValidationError('Username Already Exist in database')
    #     return value

    def validate_email(self, value):
        if User.objects.filter(email = value).exists():
            raise serializers.ValidationError('Email is already Exist in database')
        return value


    def validate(self, attr):  #object level validation in attr is Dict(pass, confirm pass etc)
        if attr.get('password') != attr.get('confirm_password'):
            raise serializers.ValidationError('password not matched')
        return attr
    
    def create(self, validated_data):
        validated_data.pop('confirm_password', None)
        # confirm_password database model ka hissa nahi hai, isliye ise hataana zaroori hai
    
        user = User.objects.create_user(

            email = validated_data['email'],
            password = validated_data['password'],
            first_name = validated_data['first_name'],
            last_name = validated_data['last_name']

        )

        return user



class ProfileSerializer(serializers.ModelSerializer):
    email = serializers.CharField(source = 'user.email', read_only = True)
    first_name = serializers.CharField(source = 'user.first_name', read_only = True)
    last_name = serializers.CharField(source = 'user.last_name', read_only = True)

    class Meta:
                model = Profile
                fields = [
                "id",
                "email",
                "first_name",
                "last_name",
                "phone",
                "city",
                "updated_at",
            ]
                read_only_fields = [
                "id",
                "email",
                "first_name",
                "last_name",
                "updated_at",
            ]
    

    