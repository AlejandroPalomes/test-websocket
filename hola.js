define([], function(){
   function sayHello(mensaje){
      alert("hola " + mensaje)
   }

   return {
      hello: function(mensaje){
         sayHello(mensaje)
      }
   }
})