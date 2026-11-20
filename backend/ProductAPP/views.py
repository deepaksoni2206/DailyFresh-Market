from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Category, Product, Cart, CartItem, Order, OrderItem
from .serializers import Categoryserializer, ProductSeraiizer, CartItemSerializer, CartSerializer, CartItemDetailSerializer, OrderSerializer, OrderItemSerializer
from rest_framework import status

from django.shortcuts import get_object_or_404
# Create your views here.

class CategroyView(APIView):
    def get(self, request):
        category = Category.objects.all()
        serializer = Categoryserializer(category, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = Categoryserializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"Message":"Category Created Successfully"}, status =status.HTTP_201_CREATED)
        return Response(serializer.errors)

class ProductView(APIView):
    # def get(self, request):
    #     product_list = Product.objects.select_related('category')
    #     serializer = ProductSeraiizer(product_list, many = True)
    #     return Response({"Message":"Product List Feteched Successfully",
    #                      "data":serializer.data},
    #                      status=status.HTTP_200_OK
    #                      )


# samjo ki user [http://127.0.0.1:8000/api/products/?category=beverages] esa bejega to hame  category me jo hai use get krna padega aur fir  query chalenge ki data nikalo aur filter kro  fir hum conditon lagega
    def get(self, request):
        category_parm = request.query_params.get('category')

        if category_parm:
            queryset = Product.objects.select_related('category').filter(is_available = True, category__slug =category_parm)
        else:
            queryset = Product.objects.select_related('category').filter(is_available = True)

        serializer = ProductSeraiizer(queryset, many=True)
        return Response({"Message":"Product List Feteched Successfully",
                         "data":serializer.data},   
                         status=status.HTTP_200_OK
                         )

    
# isme hum post krte time ID bhi bjengae category ki 
    def post(self, request):
        serializer = ProductSeraiizer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"Message":"Product created Succesfully",
                             "data": serializer.data},
                             status = status.HTTP_201_CREATED
                             )
        return Response(serializer.errors)

# With one more condition 

# class ProductView(APIView):
#     def get(self, request):
#         category_param = request.query_params.get('category')
        
#         # Base queryset
#         queryset = Product.objects.select_related('category').filter(is_available=True)
        
#         if category_param:
#             # Check karein ki kya category_param ek number hai (yani ID hai)
#             if category_param.isdigit():
#                 queryset = queryset.filter(category_id=category_param)
#             else:
#                 # Agar number nahi hai, toh slug maan kar filter karein
#                 queryset = queryset.filter(category__slug__iexact=category_param)
                
#         serializer = ProductSerializer(queryset, many=True)
#         return Response({"message": "Success", "data": serializer.data}, status=status.HTTP_200_OK)




class ProductDetailView(APIView):
    def get(self, request, id ):
        product = get_object_or_404(Product.objects.select_related('category'),id=id)
        serializer = ProductSeraiizer(product)
        return Response({
            'Message':"Product detail Feteched Successfully",
            'data':serializer.data},
            status=status.HTTP_200_OK)

# Code ye hai:product = get_object_or_404(Product.objects.select_related('category'), id=id)

# Maan lijiye user ne browser ya Postman me URL dala: [http://127.0.0.1:8000/api/products/5/](http://127.0.0.1:8000/api/products/5/)
# Yahan URL se id = 5 nikal kar function ke andar aaya. Ab ye line kaise chalegi?

# Step-by-Step Execution Flow (Parde ke Peeche kya hota hai)
# 1. Sabse Pehle: Product.objects (Dukaan ka gate kholna)
# Django sabse pehle Product model (table) ke paas jata hai aur kehta hai ki mujhe is table se data chahiye (.objects).

# 2. Uske Baad: .select_related('category') (Pehle se taiyari karna)
# Django raste me hi sochta hai: "Arey, mujhe sirf product nahi chahiye, iska category ka naam bhi chahiye hoga."

# Isliye wo turant ek SQL JOIN ka plan bana leta hai ki: "Main jab Product table me jaunga, toh sath hi sath Category table ko bhi jod (join) loonga taaki mujhe do baar database na aana pade."

# Abhi tak database par query gayi nahi hai, bas ek advance plan (QuerySet) taiyar hua hai.

# 3. Phir: id=id (Matlab id=5) (Shikaar dhoondhna)
# Ye plan uthakar get_object_or_404 ke andar dala jata hai.

# get_object_or_404 is plan ke aage ek aur shart jod deta hai: .get(id=5) — yani "Mujhe wahi product do jiski ID 5 hai."

# 4. Database par Final Attack (Query Run hona)
# Ab ye poori command database ke paas jati hai aur ek hi SQL query chalti hai:(Product table aur Category table ko milao, aur wahi row do jahan Product ki ID 5 ho).

# 5. Aakhri Check: get_object_or_404 ka Safety Guard (Sabse Important!)
# Case A (Agar ID 5 mil gayi): Database ne product aur category laakar de diya. Wo product variable ke andar save ho gaya.

# Case B (Agar ID 5 database me hai hi nahi, maan lo koi 500 number dal de): Database kuch nahi la payega. Jaise hi get_object_or_404 ko data nahi milega, wo turant code ko rok dega aur user ko seedha 404 Not Found ka error page/response bhej dega (App crash nahi hoga!).





#         1. View ka kaam:
            # - Logged-in user ka Cart find karna.
            # - Request receive karna.
            # - Serializer validate karwana.
            # - Response return karna.

              # Step 1: User ka Cart find karo ya create karo
                 # Step 2: Request data serializer ko do
                 # Step 3: Data validate karo
                  # Step 4: Serializer ke create() se CartItem save karo
                   # Step 5: Response return karo
    

# Cart Item View ka process
# 1. POST request receive karta hai.
# 2. User ka cart find karta hai ya create karta hai.
# 3. Serializer ko request data aur cart deta hai.
# 4. is_valid() se validation karwata hai.
# 5. save() call karta hai.
# 6. Success response return karta hai.


# GET View ka process
# 1. GET request receive karo.
# 2. Logged-in user ka cart Cart.objects.get(user=request.user) se nikalo.
# 3. Cart ke items cart.items.all() se nikalo.
# 4. Items ko serializer mein pass karo.
# 5. serializer.data ko Response() mein return karo.
from rest_framework.permissions import IsAuthenticated

class CartApiView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        cart, created = Cart.objects.get_or_create(user=request.user)
        items = cart.items.all()
        serializer = CartItemDetailSerializer(items, many=True)

        items_total=0
        for item in serializer.data:
            items_total +=  item['subtotal']

        delivery_fee=0
        if items_total < 500 and items_total> 0:
            delivery_fee = 30.0
        else:
            delivery_fee =0.0

        grand_total = items_total + delivery_fee
        return Response({
            'Message': 'Cart Items',
            'data': {
                'items': serializer.data,
                'pricing': {
                    'items_total': items_total,
                    'delivery_fee': delivery_fee,
                    'grand_total': grand_total
                }
            }
        })
    def post(self,request):
        cart, created = Cart.objects.get_or_create(user=request.user)
        serializer = CartItemSerializer(data= request.data,  context={"cart": cart})

        if serializer.is_valid():
            serializer.save()
            return Response ({'Message':'Item Added to cart Successfully', 'data':serializer.data},status=201)
        return Response(serializer.errors, status=400)

# cart clear
    def delete(self, request):
        try:
            cart = Cart.objects.get(user=request.user)
            cart.items.all().delete()
            return Response({'Message': 'Cart cleared successfully'}, status=200)
        except Cart.DoesNotExist:
            return Response({'Message': 'Cart does not Found'}, status=200)

from django.shortcuts import get_object_or_404

'''
1. Receive PATCH Request (with Item ID in URL and new 'qty' in Body).
2. Check if user is authenticated (Logged-in).
3. Find the user's Cart:
   - If cart does not exist -> Return 404 Error.
4. Find the specific CartItem:
   - Match item ID (`pk`) AND ensure it belongs to the user's cart (Security check).
   - If item not found -> Return 404 Error.
5. Extract 'qty' from request data:
   - If 'qty' is missing -> Return 400 Error.
   - Convert 'qty' to integer. If it fails (e.g. text passed) -> Return 400 Error.
6. Check quantity value:
   - IF new_qty < 1:
       - Delete the item from cart (item.delete()).
       - Return success response ("Item removed").
   - ELSE:
       - Update item.qty = new_qty.
       - Save the item to database (item.save()).
       - Serialize the updated item and return 200 OK with data.


'''







class ItemsUpdateApiview(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        return self.patch(request, pk)

    def patch(self, request, pk):
        cart = get_object_or_404(Cart, user=request.user)
        items =get_object_or_404(CartItem, pk=pk, cart=cart)

        qty = request.data.get('qty')
        if qty is None:
            return Response({'Message':'qty is none'})

        new_qty = int(qty)
        if new_qty < 1:
            items.delete()
            return Response({'message': 'Item removed from cart'}, status=200)

        if new_qty > items.product.stock:
            stock_left = items.product.stock
            return Response({
                'error': f'Only {stock_left} items are available in stock.'
            }, status=400)  
            # return Response({'error': 'Requested quantity exceeds available stock.'}, status=200)


        items.qty = new_qty
        items.save()

        serializer = CartItemSerializer(items)
        return Response({'message': 'Quantity updated successfully', 'data': serializer.data}, status=200)

    def delete(self, request,pk):
        cart = get_object_or_404(Cart, user=request.user)
        items =get_object_or_404(CartItem, pk=pk, cart=cart)

        items.delete()
        return Response({'message': 'Item removed from cart'}, status=200)


        

# create Order API

class Create_Order(APIView):
    def post(self, request):

        cart = Cart.objects.filter(user= request.user).first()

        if not cart:
            return Response({'Message': 'Cart Not Found'}, status=status.HTTP_404_NOT_FOUND)

        items = cart.items.all()

        if not items:
            return Response({'Message': 'Cart is Empty'}, status=status.HTTP_400_BAD_REQUEST)

        total_amount = sum(item.product.price * item.qty for item in items)

        order = Order.objects.create(user=request.user, total_amount=total_amount)

        print(OrderItem)
        print(OrderItem._meta.fields)

        for item in items:
            OrderItem.objects.create(
                order=order,
                product=item.product,
                qty=item.qty,
                price=item.product.price
            )

        # Clear the cart after creating the order
        items.delete()

        return Response({
            'Message': 'Order Created Successfully',
            'order_id': order.id,
            'total_amount': total_amount
        }, status=status.HTTP_201_CREATED)

# # order_place payload for post

# {


# }


class OrderListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Order model se query karein aur items + products prefetch karein
        orders = Order.objects.filter(user=request.user).prefetch_related('items__product')

        serializer = OrderSerializer(orders, many=True)
        return Response({
            'Message': 'Order List Fetched Successfully', 
            'data': serializer.data
        }, status=status.HTTP_200_OK)
        
# class OrderDetailView(APIView):

#     permission_classes = [IsAuthenticated]
#     def get(self, request, order_id):
#         order= OrderItem.objects.filter(order__id=order_id, order__user=request.user).select_related('order', 'product')

#         serializer = OrderItemSerializer(order, many=True)
#         return Response({'Message': 'Order Details Fetched Successfully', 'data': serializer.data}, status=status.HTTP_200_OK)


class OrderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        order = Order.objects.filter(
            id=order_id,
            user=request.user
        ).first()

        if order is None:
            return Response(
                {'Message': 'Order Not Found'},
                status=status.HTTP_404_NOT_FOUND
            )

        order_items = OrderItem.objects.filter(
            order=order
        ).select_related('order', 'product')

        serializer = OrderItemSerializer(order_items, many=True)
        return Response({
            'Message': 'Order Details Fetched Successfully', 
            'data': serializer.data
        }, status=status.HTTP_200_OK)

        



    

#----------------------------------------------------------------------------------


from rest_framework import generics
from rest_framework.filters import SearchFilter
# from .models import Product
# from .serializers import ProductSeraiizer # Jo serializer aap products ke liye use kar rahe hain

class ProductSearchView(generics.ListAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSeraiizer
    filter_backends = [SearchFilter]
    # Yahan woh fields likhein jinpar aap search lagana chahte hain
    search_fields = ['name', 'slug', 'unit']


